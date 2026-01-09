/**
 * Complete ChatKit Widget System
 * 
 * Full implementation of all OpenAI ChatKit widgets with proper types
 * Based on OpenAI ChatKit Widgets specification
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export type WidgetIcon = 
  | "agent" | "analytics" | "atom" | "batch" | "bolt" | "book-open" | "book-closed" 
  | "book-clock" | "bug" | "calendar" | "chart" | "check" | "check-circle" 
  | "check-circle-filled" | "chevron-left" | "chevron-right" | "circle-question" 
  | "compass" | "confetti" | "cube" | "desktop" | "document" | "dot" 
  | "dots-horizontal" | "dots-vertical" | "empty-circle" | "external-link" 
  | "globe" | "keys" | "lab" | "images" | "info" | "lifesaver" | "lightbulb" 
  | "mail" | "map-pin" | "maps" | "mobile" | "name" | "notebook" 
  | "notebook-pencil" | "page-blank" | "phone" | "play" | "plus" | "profile" 
  | "profile-card" | "reload" | "star" | "star-filled" | "search" | "sparkle" 
  | "sparkle-double" | "square-code" | "square-image" | "square-text" 
  | "suitcase" | "settings-slider" | "user" | "wreath" | "write" | "write-alt" 
  | "write-alt2";

export type ControlSize = "3xs" | "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type ControlVariant = "solid" | "soft" | "outline" | "ghost";
export type TextSize = "xs" | "sm" | "md" | "lg" | "xl";
export type TitleSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
export type CaptionSize = "sm" | "md" | "lg";
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type RadiusValue = "2xs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "full" | "100%" | "none";
export type Alignment = "start" | "center" | "end" | "baseline" | "stretch";
export type Justification = "start" | "center" | "end" | "stretch" | "between" | "around" | "evenly";
export type TextAlign = "start" | "center" | "end";
export type FontWeight = "normal" | "medium" | "semibold" | "bold";
export type BadgeColor = "info" | "secondary" | "discovery" | "success" | "warning" | "danger";
export type ButtonColor = "primary" | "secondary" | "info" | "discovery" | "success" | "caution" | "warning" | "danger";
export type TextColor = "prose" | "primary" | "emphasis" | "secondary" | "tertiary" | "success" | "warning" | "danger";
export type CurveType = "basis" | "basisClosed" | "basisOpen" | "bumpX" | "bumpY" | "bump" | "linear" | "linearClosed" | "natural" | "monotoneX" | "monotoneY" | "monotone" | "step" | "stepBefore" | "stepAfter";

export interface ActionConfig {
  type: string;
  payload?: Record<string, unknown>;
  handler?: "client" | "server";
  loadingBehavior?: "auto" | "self" | "container" | "none";
}

export interface ThemeColor {
  light: string;
  dark: string;
}

export interface Spacing {
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
  x?: number | string;
  y?: number | string;
}

export interface Border {
  size: number;
  color?: string | ThemeColor;
  style?: "solid" | "dashed" | "dotted" | "double" | "groove" | "ridge" | "inset" | "outset";
}

export interface Borders {
  top?: number | Border;
  right?: number | Border;
  bottom?: number | Border;
  left?: number | Border;
  x?: number | Border;
  y?: number | Border;
}

export interface EditableProps {
  name: string;
  autoFocus?: boolean;
  autoSelect?: boolean;
  autoComplete?: string;
  allowAutofillExtensions?: boolean;
  pattern?: string;
  placeholder?: string;
  required?: boolean;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface BarSeries {
  type: "bar";
  dataKey: string;
  label?: string;
  color?: string | ThemeColor;
  stack?: string;
}

export interface LineSeries {
  type: "line";
  dataKey: string;
  label?: string;
  color?: string | ThemeColor;
  curveType?: CurveType;
}

export interface AreaSeries {
  type: "area";
  dataKey: string;
  label?: string;
  color?: string | ThemeColor;
  curveType?: CurveType;
  stack?: string;
}

export type Series = BarSeries | LineSeries | AreaSeries;

export interface XAxisConfig {
  dataKey: string;
  hide?: boolean;
  labels?: Record<string, string>;
}

export interface WidgetStatusWithFavicon {
  text: string;
  favicon?: string;
  frame?: boolean;
}

export interface WidgetStatusWithIcon {
  text: string;
  icon?: WidgetIcon;
}

export type WidgetStatus = WidgetStatusWithFavicon | WidgetStatusWithIcon;

export interface CardAction {
  label: string;
  action: ActionConfig;
}

// ============================================================================
// BASE WIDGET INTERFACE
// ============================================================================

export interface BaseWidget {
  key?: string;
  id?: string;
  type: string;
}

export interface BoxBase extends BaseWidget {
  children?: WidgetComponent[];
  align?: Alignment;
  justify?: Justification;
  wrap?: "nowrap" | "wrap" | "wrap-reverse";
  flex?: number | string;
  gap?: number | string;
  height?: number | string;
  width?: number | string;
  size?: number | string;
  minHeight?: number | string;
  minWidth?: number | string;
  minSize?: number | string;
  maxHeight?: number | string;
  maxWidth?: number | string;
  maxSize?: number | string;
  padding?: number | string | Spacing;
  margin?: number | string | Spacing;
  border?: number | Border | Borders;
  radius?: RadiusValue;
  background?: string | ThemeColor;
  aspectRatio?: number | string;
}

// ============================================================================
// WIDGET COMPONENTS
// ============================================================================

export interface Button extends BaseWidget {
  type: "Button";
  submit?: boolean;
  label?: string;
  onClickAction?: ActionConfig;
  iconStart?: WidgetIcon;
  iconEnd?: WidgetIcon;
  style?: "primary" | "secondary";
  iconSize?: "sm" | "md" | "lg" | "xl" | "2xl";
  color?: ButtonColor;
  variant?: ControlVariant;
  size?: ControlSize;
  pill?: boolean;
  uniform?: boolean;
  block?: boolean;
  disabled?: boolean;
}

export interface Text extends BaseWidget {
  type: "Text";
  value: string;
  streaming?: boolean;
  italic?: boolean;
  lineThrough?: boolean;
  color?: string | ThemeColor | TextColor;
  weight?: FontWeight;
  width?: number | string;
  size?: TextSize;
  textAlign?: TextAlign;
  truncate?: boolean;
  minLines?: number;
  maxLines?: number;
  editable?: false | EditableProps;
}

export interface Title extends BaseWidget {
  type: "Title";
  value: string;
  color?: string | ThemeColor | TextColor;
  weight?: FontWeight;
  size?: TitleSize;
  textAlign?: TextAlign;
  truncate?: boolean;
  maxLines?: number;
}

export interface Caption extends BaseWidget {
  type: "Caption";
  value: string;
  color?: string | ThemeColor | TextColor;
  weight?: FontWeight;
  size?: CaptionSize;
  textAlign?: TextAlign;
  truncate?: boolean;
  maxLines?: number;
}

export interface Markdown extends BaseWidget {
  type: "Markdown";
  value: string;
  streaming?: boolean;
}

export interface Badge extends BaseWidget {
  type: "Badge";
  label: string;
  color?: BadgeColor;
  variant?: "solid" | "soft" | "outline";
  size?: "sm" | "md" | "lg";
  pill?: boolean;
}

export interface Box extends BoxBase {
  type: "Box";
  direction?: "row" | "col";
}

export interface Row extends BoxBase {
  type: "Row";
}

export interface Col extends BoxBase {
  type: "Col";
}

export interface Form extends BoxBase {
  type: "Form";
  onSubmitAction?: ActionConfig;
  direction?: "row" | "col";
}

export interface Divider extends BaseWidget {
  type: "Divider";
  color?: string | ThemeColor;
  size?: number | string;
  spacing?: number | string;
  flush?: boolean;
}

export interface Icon extends BaseWidget {
  type: "Icon";
  name: WidgetIcon;
  color?: string | ThemeColor | TextColor;
  size?: IconSize;
}

export interface Image extends BaseWidget {
  type: "Image";
  src: string;
  alt?: string;
  fit?: "cover" | "contain" | "fill" | "scale-down" | "none";
  position?: "top left" | "top" | "top right" | "left" | "center" | "right" | "bottom left" | "bottom" | "bottom right";
  radius?: RadiusValue;
  frame?: boolean;
  flush?: boolean;
  height?: number | string;
  width?: number | string;
  size?: number | string;
  minHeight?: number | string;
  minWidth?: number | string;
  minSize?: number | string;
  maxHeight?: number | string;
  maxWidth?: number | string;
  maxSize?: number | string;
  margin?: number | string | Spacing;
  background?: string | ThemeColor;
  aspectRatio?: number | string;
  flex?: number | string;
}

export interface Input extends BaseWidget {
  type: "Input";
  name: string;
  inputType?: "number" | "email" | "text" | "password" | "tel" | "url";
  defaultValue?: string;
  required?: boolean;
  pattern?: string;
  placeholder?: string;
  allowAutofillExtensions?: boolean;
  autoSelect?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  variant?: "soft" | "outline";
  size?: ControlSize;
  gutterSize?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
  pill?: boolean;
}

export interface Textarea extends BaseWidget {
  type: "Textarea";
  name: string;
  defaultValue?: string;
  required?: boolean;
  pattern?: string;
  placeholder?: string;
  autoSelect?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  variant?: "soft" | "outline";
  size?: ControlSize;
  gutterSize?: "2xs" | "xs" | "sm" | "md" | "lg" | "xl";
  rows?: number;
  autoResize?: boolean;
  maxRows?: number;
  allowAutofillExtensions?: boolean;
}

export interface Select extends BaseWidget {
  type: "Select";
  name: string;
  options: SelectOption[];
  onChangeAction?: ActionConfig;
  placeholder?: string;
  defaultValue?: string;
  variant?: ControlVariant;
  size?: ControlSize;
  pill?: boolean;
  block?: boolean;
  clearable?: boolean;
  disabled?: boolean;
}

export interface DatePicker extends BaseWidget {
  type: "DatePicker";
  name: string;
  onChangeAction?: ActionConfig;
  placeholder?: string;
  defaultValue?: string; // ISO date string
  min?: string; // ISO date string
  max?: string; // ISO date string
  variant?: ControlVariant;
  size?: ControlSize;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  pill?: boolean;
  block?: boolean;
  clearable?: boolean;
  disabled?: boolean;
}

export interface Checkbox extends BaseWidget {
  type: "Checkbox";
  name: string;
  label?: string;
  defaultChecked?: boolean;
  onChangeAction?: ActionConfig;
  disabled?: boolean;
  required?: boolean;
}

export interface RadioGroup extends BaseWidget {
  type: "RadioGroup";
  name: string;
  options?: RadioOption[];
  ariaLabel?: string;
  onChangeAction?: ActionConfig;
  defaultValue?: string;
  direction?: "row" | "col";
  disabled?: boolean;
  required?: boolean;
}

export interface Label extends BaseWidget {
  type: "Label";
  value: string;
  fieldName: string;
  size?: TextSize;
  weight?: FontWeight;
  textAlign?: TextAlign;
  color?: string | ThemeColor | TextColor;
}

export interface Spacer extends BaseWidget {
  type: "Spacer";
  minSize?: number | string;
}

export interface ListViewItem extends BaseWidget {
  type: "ListViewItem";
  children: WidgetComponent[];
  onClickAction?: ActionConfig;
  gap?: number | string;
  align?: Alignment;
}

export interface ListView extends BaseWidget {
  type: "ListView";
  children: ListViewItem[];
  limit?: number | "auto";
  status?: WidgetStatus;
  theme?: "light" | "dark";
}

export interface Card extends BaseWidget {
  type: "Card";
  asForm?: boolean;
  children: WidgetComponent[];
  background?: string | ThemeColor;
  size?: "sm" | "md" | "lg" | "full";
  padding?: number | string | Spacing;
  status?: WidgetStatus;
  collapsed?: boolean;
  confirm?: CardAction;
  cancel?: CardAction;
  theme?: "light" | "dark";
}

export interface Chart extends BaseWidget {
  type: "Chart";
  data: Array<Record<string, string | number>>;
  series: Series[];
  xAxis: string | XAxisConfig;
  showYAxis?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  barGap?: number;
  barCategoryGap?: number | string;
  flex?: number | string;
  height?: number | string;
  width?: number | string;
  size?: number | string;
  minHeight?: number | string;
  minWidth?: number | string;
  minSize?: number | string;
  maxHeight?: number | string;
  maxWidth?: number | string;
  maxSize?: number | string;
  aspectRatio?: number | string;
}

export interface Transition extends BaseWidget {
  type: "Transition";
  children?: WidgetComponent;
}

// ============================================================================
// WIDGET UNION TYPE
// ============================================================================

export type WidgetComponent =
  | Button
  | Text
  | Title
  | Caption
  | Markdown
  | Badge
  | Box
  | Row
  | Col
  | Form
  | Divider
  | Icon
  | Image
  | Input
  | Textarea
  | Select
  | DatePicker
  | Checkbox
  | RadioGroup
  | Label
  | Spacer
  | ListViewItem
  | ListView
  | Card
  | Chart
  | Transition;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createButton(props: Omit<Button, "type">): Button {
  return {
    type: "Button",
    variant: "solid",
    color: "primary",
    size: "lg",
    pill: true,
    ...props,
  };
}

export function createText(props: Omit<Text, "type">): Text {
  return {
    type: "Text",
    size: "md",
    weight: "normal",
    ...props,
  };
}

export function createTitle(props: Omit<Title, "type">): Title {
  return {
    type: "Title",
    size: "md",
    weight: "medium",
    color: "prose",
    ...props,
  };
}

export function createForm(props: Omit<Form, "type">): Form {
  return {
    type: "Form",
    direction: "col",
    gap: 2,
    ...props,
  };
}

export function createCard(props: Omit<Card, "type">): Card {
  return {
    type: "Card",
    size: "md",
    padding: 4,
    ...props,
  };
}

export function createInput(props: Omit<Input, "type">): Input {
  return {
    type: "Input",
    inputType: "text",
    variant: "outline",
    size: "md",
    ...props,
  };
}

export function createSelect(props: Omit<Select, "type">): Select {
  return {
    type: "Select",
    variant: "outline",
    size: "md",
    ...props,
  };
}

export function createChart(props: Omit<Chart, "type">): Chart {
  return {
    type: "Chart",
    showLegend: true,
    showTooltip: true,
    ...props,
  };
}

export function createTextarea(props: Omit<Textarea, "type">): Textarea {
  return {
    type: "Textarea",
    variant: "outline",
    size: "md",
    rows: 3,
    ...props,
  };
}

export function createCheckbox(props: Omit<Checkbox, "type">): Checkbox {
  return {
    type: "Checkbox",
    ...props,
  };
}

export function createLabel(props: Omit<Label, "type">): Label {
  return {
    type: "Label",
    size: "sm",
    weight: "medium",
    ...props,
  };
}

export function createDivider(props: Omit<Divider, "type">): Divider {
  return {
    type: "Divider",
    size: 1,
    ...props,
  };
}

export function createBox(props: Omit<Box, "type">): Box {
  return {
    type: "Box",
    direction: "col",
    gap: 2,
    ...props,
  };
}

export function createRow(props: Omit<Row, "type">): Row {
  return {
    type: "Row",
    direction: "row",
    gap: 2,
    ...props,
  };
}

export function createCol(props: Omit<Col, "type">): Col {
  return {
    type: "Col",
    direction: "col",
    gap: 2,
    ...props,
  };
}

export function createSpacer(props: Omit<Spacer, "type">): Spacer {
  return {
    type: "Spacer",
    minSize: "auto",
    ...props,
  };
}

export function createBadge(props: Omit<Badge, "type">): Badge {
  return {
    type: "Badge",
    variant: "soft",
    size: "sm",
    pill: true,
    ...props,
  };
}

export function createListView(props: Omit<ListView, "type">): ListView {
  return {
    type: "ListView",
    ...props,
  };
}

export function createListViewItem(props: Omit<ListViewItem, "type">): ListViewItem {
  return {
    type: "ListViewItem",
    ...props,
  };
}

