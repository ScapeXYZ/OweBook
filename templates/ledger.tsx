import { Column, Divider, Heading, Html, Page, Row, Section, Text, type PageProps } from "@hyper-elements/react";
import { bucket, buckets, type Summary } from "../core/ledger.js";
import { formatDate, money } from "../core/values.js";
import { sample } from "../kit/sample.js";
import { fills, ink, label, redLine, rule, ruled, theme, tierLabels } from "../kit/theme.js";

function escape(value: string) {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, char => entities[char]);
}
export default function Ledger({ summary, fonts }: { summary: Summary; fonts?: PageProps["fonts"] }) {
  const { shop, asOf } = summary;
  const amount = (value: number) => money(value, shop.currency);
  const owing = summary.ledgers.filter(customer => customer.credit === 0);
  const credit = summary.ledgers.filter(customer => customer.credit > 0);
  const headers = ["Customer", "Balance", "Overdue", "Oldest overdue", "Last payment", "Tier"];
  const rows = owing.map(customer => [
    customer.name, amount(customer.balance), amount(customer.overdue), customer.oldest ? customer.oldest + " days" : "—",
    customer.lastPayment === undefined ? "—" : formatDate(customer.lastPayment), tierLabels[customer.tier]
  ]);
  const html = '<style>.owetable{width:100%;table-layout:fixed;border-collapse:collapse;color:' + ink +
    '}.owetable th,.owetable td{border-bottom:1px solid ' + rule + ';padding:10px 6px;overflow-wrap:anywhere;text-align:left}' +
    '.owetable th{font-size:12px;text-transform:uppercase;letter-spacing:.8px}.owetable th:nth-child(2),.owetable th:nth-child(3),.owetable td:nth-child(2),.owetable td:nth-child(3){text-align:right}' +
    '.owetable span{padding:3px 6px;display:inline-block}.owe-mobile-row{margin-bottom:12px}.owe-mobile-name,.owe-mobile-field{border-bottom:1px solid ' + rule +
    ';padding:5px;overflow-wrap:anywhere}.owe-mobile-field{display:flex;justify-content:space-between;gap:8px}.owe-mobile-label{white-space:nowrap;font-size:12px;text-transform:uppercase;letter-spacing:.8px}</style>' +
    '<table class="owetable"><thead><tr>' + headers.map(header => '<th scope="col">' + header + '</th>').join("") +
    '</tr></thead><tbody>' + rows.map((row, index) => '<tr>' + row.map((cell, col) => '<td data-label="' + headers[col] + '">' +
      (col === 5 ? '<span style="background:' + fills[bucket(owing[index].oldest)] + '">' + escape(cell) + '</span>' : escape(cell)) + '</td>').join("") + '</tr>').join("") + '</tbody></table>';
  const cards = [
    ["Total outstanding", amount(summary.outstanding)], ["Total overdue", amount(summary.overdue)],
    ["Customers owing", String(summary.owingCount)], ["Customers overdue", String(summary.overdueCount)]
  ];
  const mobile = rows.map((row, index) => '<div class="owe-mobile-row"><div class="owe-mobile-name">' + escape(row[0]) + '</div>' +
    row.slice(1).map((cell, i) => '<div class="owe-mobile-field"><span class="owe-mobile-label">' + headers[i + 1] + '</span>' +
      (i === 4 ? '<span style="padding:3px 6px;background:' + fills[bucket(owing[index].oldest)] + '">' : '<span>') +
      escape(cell) + '</span></div>').join("") + '</div>').join("");
  return <Page title="Owner ledger" lang="en" width={1080} breakpoints={{ mobile: 480 }} theme={theme} fonts={fonts}>
    <Section style={{ padding: 18 }}>
      <Column style={{ border: { left: redLine }, padding: 14, gap: 16 }}>
        <Text style={label}>{shop.name}</Text>
        <Heading level={1} style={{ fontSize: 38 }}>Owner ledger</Heading>
        <Text>As of {formatDate(asOf)}</Text>
        <Column style={{ gap: 2 }}><Divider style={{ borderTop: ruled }} /><Divider style={{ borderTop: ruled }} /></Column>
        <Row stackOnMobile style={{ gap: 8 }}>{cards.map(([name, value]) => <Column key={name} style={{ padding: 10, backgroundColor: fills[0] }}>
          <Text style={label}>{name}</Text><Text style={{ textAlign: "right", fontSize: value.length > 19 ? 17 : 21, fontWeight: 700 }}>{value}</Text>
        </Column>)}</Row>
        <Heading level={2} style={{ fontSize: 20 }}>Aging summary</Heading>
        {summary.outstanding > 0 && <Html text="" html={'<div aria-hidden="true" style="display:flex;height:12px">' +
          summary.aging.map((value, index) => '<div style="width:' + (value / summary.outstanding * 100) + '%;background:' + fills[index] + '"></div>').join("") + '</div>'} />}
        <Row stackOnMobile style={{ gap: 8 }}>{buckets.map((name, i) => <Column key={name} style={{ padding: 6, backgroundColor: fills[i] }}>
          <Text style={label}>{name}</Text><Text style={{ textAlign: "right" }}>{amount(summary.aging[i])}</Text>
        </Column>)}</Row>
        <Heading level={2} style={{ fontSize: 20 }}>Customer balances</Heading>
        <Column hidden={{ mobile: true }}><Html html={html} text={[headers.join(" | "), ...rows.map(row => row.join(" | "))].join("\n")} /></Column>
        <Column hidden={{ desktop: true }}><Html html={'<div class="owe-mobile">' + mobile + '</div>'} text="" /></Column>
        <Heading level={2} style={{ fontSize: 20 }}>Customers with credit</Heading>
        {!credit.length && <Text>No credit balances.</Text>}
        {credit.map(customer => <Row key={customer.id} style={{ border: { bottom: ruled }, padding: 5 }}><Text>{customer.name}</Text><Text style={{ textAlign: "right" }}>{amount(customer.balance)}</Text></Row>)}
        {summary.total_credit > 0 && <Row style={{ border: { bottom: ruled }, padding: 5 }}><Text style={label}>Total credit</Text><Text style={{ textAlign: "right" }}>{amount(-summary.total_credit)}</Text></Row>}
        <Heading level={2} style={{ fontSize: 20 }}>Warnings</Heading>
        {summary.warnings.length ? summary.warnings.map((warning, index) => <Text key={index}>{warning}</Text>) : <Text>No entries ignored.</Text>}
      </Column>
    </Section>
  </Page>;
}
Ledger.PreviewProps = { summary: sample };
