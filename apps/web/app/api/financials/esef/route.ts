import { NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '@/lib/supabase-server';

const XML_HEADER = `<?xml version="1.0" encoding="UTF-8"?>`;

function formatAmount(value: number) {
  return Number(value.toFixed(2));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const entityId = url.searchParams.get('entityId');
  const periodId = url.searchParams.get('periodId');
  const periodLabel = url.searchParams.get('periodLabel') ?? 'FY2025';
  const currency = url.searchParams.get('currency') ?? 'EUR';
  const basis = url.searchParams.get('basis') ?? 'IFRS_EU';

  if (!orgId || !entityId || !periodId) {
    return NextResponse.json(
      { error: 'orgId, entityId, and periodId are required' },
      { status: 400 },
    );
  }

  const supabase = await getServiceSupabaseClient();

  const { data: fsLines, error: fsError } = await supabase
    .from('fs_lines')
    .select('id, code, label, statement')
    .eq('org_id', orgId)
    .eq('basis', basis)
    .order('ordering');
  if (fsError) {
    return NextResponse.json({ error: 'fs_lines_fetch_failed' }, { status: 500 });
  }

  const { data: mappings, error: mapError } = await supabase
    .from('coa_map')
    .select('account_id, fs_line_id')
    .eq('org_id', orgId)
    .eq('entity_id', entityId)
    .eq('basis', basis);
  if (mapError) {
    return NextResponse.json({ error: 'coa_map_fetch_failed' }, { status: 500 });
  }

  const accountIds = Array.from(new Set((mappings ?? []).map((row) => row.account_id)));
  const { data: entries, error: entriesError } = await supabase
    .from('ledger_entries')
    .select('account_id, debit, credit')
    .eq('org_id', orgId)
    .eq('entity_id', entityId)
    .eq('period_id', periodId)
    .in('account_id', accountIds.length ? accountIds : ['00000000-0000-0000-0000-000000000000']);
  if (entriesError) {
    return NextResponse.json({ error: 'ledger_entries_fetch_failed' }, { status: 500 });
  }

  const totalsByAccount = new Map<string, number>();
  for (const entry of entries ?? []) {
    const current = totalsByAccount.get(entry.account_id) ?? 0;
    totalsByAccount.set(entry.account_id, current + entry.debit - entry.credit);
  }

  const totalsByFsLine = new Map<string, number>();
  for (const mapping of mappings ?? []) {
    const amount = totalsByAccount.get(mapping.account_id) ?? 0;
    const current = totalsByFsLine.get(mapping.fs_line_id) ?? 0;
    totalsByFsLine.set(mapping.fs_line_id, current + amount);
  }

  const factEntries = (fsLines ?? []).map((line) => {
    const amount = totalsByFsLine.get(line.id) ?? 0;
    return {
      statement: line.statement,
      code: line.code,
      label: line.label,
      amount: formatAmount(amount),
    };
  });

  const contextId = `C_${periodId}`;
  const unitId = `U_${currency}`;

  const xhtml = `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ix="http://www.xbrl.org/2013/inlineXBRL">
  <head>
    <title>ESEF Inline XBRL</title>
  </head>
  <body>
    <div>
      <h1>Inline XBRL Extract — ${periodLabel}</h1>
      <p>Basis: ${basis}</p>
      <section>
        <h2>Financial Statements</h2>
        <table>
          <thead>
            <tr><th>Statement</th><th>Code</th><th>Label</th><th>Amount (${currency})</th></tr>
          </thead>
          <tbody>
            ${factEntries
              .map(
                (item) =>
                  `<tr>
                    <td>${item.statement}</td>
                    <td>${item.code}</td>
                    <td>${item.label}</td>
                    <td><ix:nonFraction contextRef="${contextId}" name="${item.code}" unitRef="${unitId}" decimals="0">${item.amount}</ix:nonFraction></td>
                  </tr>`
              )
              .join('\n')}
          </tbody>
        </table>
      </section>
    </div>
  </body>
</html>`;

  const contextXml = `<ix:context id="${contextId}">
  <ix:entity>
    <ix:identifier scheme="urn:orgid:${orgId}">${entityId}</ix:identifier>
  </ix:entity>
  <ix:period>
    <ix:instant>${new Date().toISOString().slice(0, 10)}</ix:instant>
  </ix:period>
</ix:context>`;

  const unitXml = `<ix:unit id="${unitId}">
  <ix:measure>iso4217:${currency}</ix:measure>
</ix:unit>`;

  const packageXml = `${XML_HEADER}
<ix:resources xmlns:ix="http://www.xbrl.org/2013/inlineXBRL">
${contextXml}
${unitXml}
</ix:resources>`;

  const boundary = '----ixbrl-boundary';
  const body = `--${boundary}\r\nContent-Type: application/xhtml+xml\r\nContent-Disposition: form-data; name="primary"; filename="report.xhtml"\r\n\r\n${xhtml}\r\n--${boundary}\r\nContent-Type: application/xml\r\nContent-Disposition: form-data; name="resources"; filename="resources.xml"\r\n\r\n${packageXml}\r\n--${boundary}--`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`,
      'Content-Disposition': `attachment; filename="${periodLabel.toLowerCase()}-esef.zip"`,
    },
  });
}
