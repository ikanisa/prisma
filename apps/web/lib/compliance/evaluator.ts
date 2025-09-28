import { promises as fs } from 'fs';
import path from 'path';

const PACK_KEY_PATTERN = /^[a-z0-9_]+$/i;

export interface ComplianceConfig {
  meta: {
    key: string;
    version: string;
    title?: string;
  };
  rates?: Record<string, number>;
  inputs?: Record<string, unknown>;
  sections?: unknown;
  calculations?: Record<string, string>;
  validations?: Array<{ expression: string; message: string }>;
}

export interface ComplianceEvaluationResult {
  outputs: Record<string, number | boolean | null>;
  errors: string[];
  provenance: {
    packKey: string;
    version: string;
  };
}

const CONFIG_BASE_PATH = path.join(process.cwd(), 'public', 'configs', 'compliance');

export async function loadComplianceConfig(packKey: string): Promise<ComplianceConfig> {
  if (!PACK_KEY_PATTERN.test(packKey)) {
    throw new Error('Invalid pack key');
  }

  const configPath = path.join(CONFIG_BASE_PATH, `${packKey}.json`);
  const raw = await fs.readFile(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as ComplianceConfig;

  if (!parsed.meta || parsed.meta.key !== packKey) {
    throw new Error('Config metadata mismatch');
  }

  return parsed;
}

type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' }
  | { type: 'dot' }
  | { type: 'arrayAll' };

type PathSegment =
  | { kind: 'key'; value: string }
  | { kind: 'array' };

type ASTNode =
  | { type: 'NumberLiteral'; value: number }
  | { type: 'Path'; segments: PathSegment[] }
  | { type: 'UnaryExpression'; operator: '-' | '+'; argument: ASTNode }
  | { type: 'BinaryExpression'; operator: string; left: ASTNode; right: ASTNode }
  | { type: 'LogicalExpression'; operator: '&&' | '||'; left: ASTNode; right: ASTNode }
  | { type: 'CallExpression'; callee: string; args: ASTNode[] };

class Tokenizer {
  private index = 0;

  constructor(private readonly input: string) {}

  tokenize(): Token[] {
    const tokens: Token[] = [];
    while (this.index < this.input.length) {
      const char = this.input[this.index];

      if (/\s/.test(char)) {
        this.index += 1;
        continue;
      }

      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(this.input[this.index + 1] ?? ''))) {
        tokens.push(this.readNumber());
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        tokens.push(this.readIdentifier());
        continue;
      }

      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
        this.index += 1;
        continue;
      }

      if (char === ',') {
        tokens.push({ type: 'comma' });
        this.index += 1;
        continue;
      }

      if (char === '.') {
        tokens.push({ type: 'dot' });
        this.index += 1;
        continue;
      }

      if (char === '[' && this.input[this.index + 1] === ']') {
        tokens.push({ type: 'arrayAll' });
        this.index += 2;
        continue;
      }

      const twoChar = this.input.slice(this.index, this.index + 2);
      if (['>=', '<=', '==', '!=', '&&', '||'].includes(twoChar)) {
        tokens.push({ type: 'operator', value: twoChar });
        this.index += 2;
        continue;
      }

      if (['+', '-', '*', '/', '<', '>'].includes(char)) {
        tokens.push({ type: 'operator', value: char });
        this.index += 1;
        continue;
      }

      throw new Error(`Unexpected character: ${char}`);
    }

    return tokens;
  }

  private readNumber(): Token {
    const start = this.index;
    let hasDot = false;

    while (this.index < this.input.length) {
      const char = this.input[this.index];
      if (char === '.') {
        if (hasDot) break;
        hasDot = true;
        this.index += 1;
        continue;
      }
      if (!/[0-9]/.test(char)) break;
      this.index += 1;
    }

    const raw = this.input.slice(start, this.index);
    const value = Number(raw);
    if (Number.isNaN(value)) {
      throw new Error(`Invalid number literal: ${raw}`);
    }
    return { type: 'number', value };
  }

  private readIdentifier(): Token {
    const start = this.index;
    while (this.index < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.index])) {
      this.index += 1;
    }
    const value = this.input.slice(start, this.index);
    return { type: 'identifier', value };
  }
}

class Parser {
  private current = 0;

  constructor(private readonly tokens: Token[]) {}

  parse(): ASTNode {
    const expr = this.parseLogicalOr();
    if (!this.isAtEnd()) {
      throw new Error('Unexpected token at end of expression');
    }
    return expr;
  }

  private parseLogicalOr(): ASTNode {
    let expr = this.parseLogicalAnd();

    while (this.matchOperator('||')) {
      const right = this.parseLogicalAnd();
      expr = { type: 'LogicalExpression', operator: '||', left: expr, right };
    }

    return expr;
  }

  private parseLogicalAnd(): ASTNode {
    let expr = this.parseEquality();

    while (this.matchOperator('&&')) {
      const right = this.parseEquality();
      expr = { type: 'LogicalExpression', operator: '&&', left: expr, right };
    }

    return expr;
  }

  private parseEquality(): ASTNode {
    let expr = this.parseComparison();

    while (this.matchOperator('==', '!=')) {
      const operator = this.previous() as Extract<Token, { type: 'operator' }>;
      const right = this.parseComparison();
      expr = { type: 'BinaryExpression', operator: operator.value, left: expr, right };
    }

    return expr;
  }

  private parseComparison(): ASTNode {
    let expr = this.parseAddition();

    while (this.matchOperator('>', '<', '>=', '<=')) {
      const operator = this.previous() as Extract<Token, { type: 'operator' }>;
      const right = this.parseAddition();
      expr = { type: 'BinaryExpression', operator: operator.value, left: expr, right };
    }

    return expr;
  }

  private parseAddition(): ASTNode {
    let expr = this.parseMultiplication();

    while (this.matchOperator('+', '-')) {
      const operator = this.previous() as Extract<Token, { type: 'operator' }>;
      const right = this.parseMultiplication();
      expr = { type: 'BinaryExpression', operator: operator.value, left: expr, right };
    }

    return expr;
  }

  private parseMultiplication(): ASTNode {
    let expr = this.parseUnary();

    while (this.matchOperator('*', '/')) {
      const operator = this.previous() as Extract<Token, { type: 'operator' }>;
      const right = this.parseUnary();
      expr = { type: 'BinaryExpression', operator: operator.value, left: expr, right };
    }

    return expr;
  }

  private parseUnary(): ASTNode {
    if (this.matchOperator('-', '+')) {
      const operator = (this.previous() as Extract<Token, { type: 'operator' }>).value as '-' | '+';
      const argument = this.parseUnary();
      return { type: 'UnaryExpression', operator, argument };
    }

    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    if (!token) {
      throw new Error('Unexpected end of expression');
    }

    if (token.type === 'number') {
      this.advance();
      return { type: 'NumberLiteral', value: token.value };
    }

    if (token.type === 'identifier') {
      this.advance();
      if (this.match('paren', '(')) {
        const args: ASTNode[] = [];
        if (!this.check('paren', ')')) {
          do {
            args.push(this.parseLogicalOr());
          } while (this.match('comma'));
        }
        this.consume('paren', ')');
        return { type: 'CallExpression', callee: token.value, args };
      }

      return this.parsePath(token as Extract<Token, { type: 'identifier' }>);
    }

    if (this.match('paren', '(')) {
      const expr = this.parseLogicalOr();
      this.consume('paren', ')');
      return expr;
    }

    throw new Error('Unexpected token in expression');
  }

  private parsePath(initial: Extract<Token, { type: 'identifier' }>): ASTNode {
    const segments: PathSegment[] = [{ kind: 'key', value: initial.value }];

    while (true) {
      if (this.match('arrayAll')) {
        segments.push({ kind: 'array' });
        continue;
      }
      if (this.match('dot')) {
        const next = this.consume('identifier') as Extract<Token, { type: 'identifier' }>;
        segments.push({ kind: 'key', value: next.value });
        continue;
      }
      break;
    }

    return { type: 'Path', segments };
  }

  private match(type: Token['type'], value?: string): boolean {
    const token = this.peek();
    if (!token || token.type !== type) return false;
    if (value !== undefined) {
      if (type === 'paren' && token.type === 'paren' && token.value !== value) return false;
      if (type === 'operator' && token.type === 'operator' && token.value !== value) return false;
    }
    this.advance();
    return true;
  }

  private matchOperator(...ops: string[]): boolean {
    const token = this.peek();
    if (!token || token.type !== 'operator') return false;
    const operatorToken = token as Extract<Token, { type: 'operator' }>;
    if (!ops.includes(operatorToken.value)) return false;
    this.advance();
    return true;
  }

  private consume(type: Token['type'], value?: string): Token {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new Error('Unexpected token');
    }
    if (value !== undefined) {
      if (type === 'paren' && token.type === 'paren' && token.value !== value) {
        throw new Error('Unexpected token');
      }
      if (type === 'operator' && token.type === 'operator' && token.value !== value) {
        throw new Error('Unexpected token');
      }
    }
    this.advance();
    return token;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1;
    }
    return this.tokens[this.current - 1];
  }

  private peek(): Token | undefined {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private check(type: Token['type'], value?: string): boolean {
    const token = this.peek();
    if (!token || token.type !== type) return false;
    if (value !== undefined) {
      if (type === 'paren' && token.type === 'paren' && token.value !== value) return false;
      if (type === 'operator' && token.type === 'operator' && token.value !== value) return false;
    }
    return true;
  }

  private isAtEnd(): boolean {
    return this.current >= this.tokens.length;
  }
}

interface EvaluationContext {
  values: Record<string, unknown>;
  outputs: Record<string, unknown>;
  constants: Record<string, unknown>;
}

class Evaluator {
  constructor(private readonly context: EvaluationContext) {}

  evaluate(expression: string): unknown {
    const tokenizer = new Tokenizer(expression);
    const tokens = tokenizer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    return this.evaluateNode(ast);
  }

  private evaluateNode(node: ASTNode): unknown {
    switch (node.type) {
      case 'NumberLiteral':
        return node.value;
      case 'Path':
        return this.resolvePath(node.segments);
      case 'UnaryExpression':
        return this.evaluateUnary(node);
      case 'BinaryExpression':
        return this.evaluateBinary(node);
      case 'LogicalExpression':
        return this.evaluateLogical(node);
      case 'CallExpression':
        return this.evaluateCall(node);
      default:
        throw new Error('Unsupported expression node');
    }
  }

  private evaluateUnary(node: Extract<ASTNode, { type: 'UnaryExpression' }>): number {
    const value = this.toNumber(this.evaluateNode(node.argument));
    return node.operator === '-' ? -value : value;
  }

  private evaluateBinary(node: Extract<ASTNode, { type: 'BinaryExpression' }>): number | boolean {
    const left = this.evaluateNode(node.left);
    const right = this.evaluateNode(node.right);

    switch (node.operator) {
      case '+':
        return this.toNumber(left) + this.toNumber(right);
      case '-':
        return this.toNumber(left) - this.toNumber(right);
      case '*':
        return this.toNumber(left) * this.toNumber(right);
      case '/':
        return this.toNumber(left) / this.toNumber(right);
      case '>':
        return this.toNumber(left) > this.toNumber(right);
      case '<':
        return this.toNumber(left) < this.toNumber(right);
      case '>=':
        return this.toNumber(left) >= this.toNumber(right);
      case '<=':
        return this.toNumber(left) <= this.toNumber(right);
      case '==':
        return this.normalize(left) === this.normalize(right);
      case '!=':
        return this.normalize(left) !== this.normalize(right);
      default:
        throw new Error(`Unsupported operator ${node.operator}`);
    }
  }

  private evaluateLogical(node: Extract<ASTNode, { type: 'LogicalExpression' }>): boolean {
    if (node.operator === '&&') {
      return this.toBoolean(this.evaluateNode(node.left)) && this.toBoolean(this.evaluateNode(node.right));
    }
    return this.toBoolean(this.evaluateNode(node.left)) || this.toBoolean(this.evaluateNode(node.right));
  }

  private evaluateCall(node: Extract<ASTNode, { type: 'CallExpression' }>): number {
    const args = node.args.map((arg) => this.evaluateNode(arg));

    switch (node.callee) {
      case 'round': {
        const value = this.toNumber(args[0]);
        const precision = args[1] !== undefined ? this.toNumber(args[1]) : 0;
        const factor = 10 ** precision;
        return Math.round(value * factor) / factor;
      }
      case 'max': {
        const values = this.flattenArgs(args);
        if (!values.length) {
          throw new Error('max requires at least one argument');
        }
        return Math.max(...values);
      }
      case 'sum': {
        const values = this.flattenArgs(args);
        return values.reduce((acc, current) => acc + current, 0);
      }
      default:
        throw new Error(`Unsupported function ${node.callee}`);
    }
  }

  private flattenArgs(args: unknown[]): number[] {
    const values: number[] = [];
    for (const arg of args) {
      if (Array.isArray(arg)) {
        for (const entry of arg) {
          values.push(this.toNumber(entry));
        }
      } else {
        values.push(this.toNumber(arg));
      }
    }
    return values;
  }

  private toNumber(value: unknown): number {
    if (Array.isArray(value)) {
      throw new Error('Expected number but received array');
    }
    if (value === null || value === undefined) {
      return 0;
    }
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }
    const num = Number(value);
    if (Number.isNaN(num)) {
      throw new Error('Unable to convert value to number');
    }
    return num;
  }

  private toBoolean(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    if (typeof value === 'boolean') {
      return value;
    }
    if (value === null || value === undefined) {
      return false;
    }
    return Boolean(value);
  }

  private normalize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.length;
    }
    if (value === undefined) {
      return null;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'string' || value === null) {
      return value;
    }
    return null;
  }

  private resolvePath(segments: PathSegment[]): unknown {
    const sources = [this.context.outputs, this.context.values, this.context.constants];

    for (const source of sources) {
      const result = this.walkSegments(source, segments);
      if (result !== undefined) {
        return result;
      }
    }

    return undefined;
  }

  private walkSegments(root: unknown, segments: PathSegment[]): unknown {
    if (root === undefined || root === null) {
      return undefined;
    }

    let current: unknown[] = [root];
    let encounteredArray = false;

    for (const segment of segments) {
      if (segment.kind === 'key') {
        current = current.map((value) => {
          if (value && typeof value === 'object') {
            return (value as Record<string, unknown>)[segment.value];
          }
          return undefined;
        });
      } else if (segment.kind === 'array') {
        encounteredArray = true;
        current = current.flatMap((value) => (Array.isArray(value) ? value : []));
      }
    }

    const filtered = current.filter((value) => value !== undefined);
    if (!filtered.length) {
      return undefined;
    }

    if (encounteredArray) {
      return filtered;
    }

    return filtered[0];
  }
}

export function evaluateCompliance(config: ComplianceConfig, values: Record<string, unknown>): ComplianceEvaluationResult {
  const outputs: Record<string, number | boolean | null> = {};
  const errors: string[] = [];

  const constants: Record<string, unknown> = {};
  if (config.rates) {
    constants.rates = config.rates;
  }

  const evaluator = new Evaluator({ values, outputs, constants });

  const calculations = config.calculations ?? {};
  for (const [key, expression] of Object.entries(calculations)) {
    try {
      const value = evaluator.evaluate(expression);
      if (Array.isArray(value)) {
        throw new Error('Calculation resolved to an unsupported array value');
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        outputs[key] = value;
      } else if (value === null || value === undefined) {
        outputs[key] = 0;
      } else {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
          throw new Error('Calculation did not resolve to a numeric value');
        }
        outputs[key] = numericValue;
      }
    } catch (error) {
      errors.push(`calculation ${key}: ${(error as Error).message}`);
    }
  }

  const validations = config.validations ?? [];
  for (const validation of validations) {
    try {
      const result = evaluator.evaluate(validation.expression);
      const passes = Array.isArray(result) ? result.length > 0 : Boolean(result);
      if (!passes) {
        errors.push(validation.message ?? `Validation failed for expression: ${validation.expression}`);
      }
    } catch (error) {
      errors.push(`validation error: ${(error as Error).message}`);
    }
  }

  return {
    outputs,
    errors,
    provenance: {
      packKey: config.meta.key,
      version: config.meta.version,
    },
  };
}
