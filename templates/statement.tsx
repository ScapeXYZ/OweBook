import { Column, Divider, Document, Heading, Row, Text } from "@hyper-elements/react";
import { buckets, type Ledger, type Summary } from "../core/ledger.js";
import { formatDate, money } from "../core/values.js";
import { sample, sampleCustomer } from "../kit/sample.js";
import { fills, label, redLine, ruled, theme } from "../kit/theme.js";

export default function Statement({ summary, customer }: { summary: Summary; customer: Ledger }) {
  const { shop, asOf } = summary;
  const amount = (value: number) => money(value, shop.currency);
  const skipped = Math.max(0, customer.entries.length - 12);
  const closing = customer.balance < 0 ? "Credit on account" : "Closing balance";
  const amountColumn = { width: 145, textAlign: "right" } as const;
  const balanceColumn = { width: 174, textAlign: "right" } as const;
  // Hyper Elements converts CSS pixels to PDF points at 72 points per 96 pixels.
  return <Document title="Customer statement" lang="en" size="A4" margin={32} theme={theme} style={{ fontSize: 11, fontFamily: "Lato" }}>
    <Column style={{ border: { left: redLine }, padding: 12, gap: 8 }}>
      <Text style={label}>{shop.name}</Text>
      <Heading level={1} style={{ fontSize: 25 }}>Customer statement</Heading>
      <Row style={{ gap: 8 }}>
        <Column><Text style={label}>Customer</Text><Text>{customer.name} · {customer.id}</Text>{customer.phone && <Text>{customer.phone}</Text>}</Column>
        <Column><Text style={{ ...label, textAlign: "right" }}>As of</Text><Text style={{ textAlign: "right" }}>{formatDate(asOf)}</Text></Column>
      </Row>
      <Divider style={{ borderTop: ruled }} />
      <Row><Text style={label}>Balance brought forward</Text><Text style={{ textAlign: "right" }}>{amount(skipped ? customer.entries[skipped - 1].balance : 0)}</Text></Row>
      {skipped > 0 && <Text>{skipped} earlier entries not shown</Text>}
      <Row style={{ backgroundColor: fills[0], padding: 4, gap: 16 }}>
        <Text style={{ ...label, width: 74 }}>Date</Text><Text style={label}>Entry</Text><Text style={{ ...label, ...amountColumn }}>Amount</Text><Text style={{ ...label, ...balanceColumn }}>Balance</Text>
      </Row>
      {customer.entries.slice(-12).map(entry => <Row key={entry.id} style={{ border: { bottom: ruled }, padding: 3, gap: 16, alignItems: "start" }}>
        <Text style={{ width: 74 }}>{formatDate(entry.date)}</Text>
        <Text>{entry.id} · {entry.type === "sale" ? "Sale" : "Payment"}{entry.note ? " · " + entry.note : ""}</Text>
        <Text style={amountColumn}>{amount(entry.amount)}</Text>
        <Text style={balanceColumn}>{amount(entry.balance)}</Text>
      </Row>)}
      <Text style={label}>Aging summary</Text>
      <Row>{buckets.map((name, i) => <Column key={name} style={{ backgroundColor: fills[i], padding: 4 }}>
        <Text>{name}</Text><Text style={{ textAlign: "right", fontWeight: 700 }}>{amount(customer.aging[i])}</Text>
      </Column>)}</Row>
      <Column style={{ gap: 2 }}><Divider style={{ borderTop: ruled }} /><Divider style={{ borderTop: ruled }} /></Column>
      <Row><Text style={label}>{closing}</Text><Text style={{ textAlign: "right", fontWeight: 700, fontSize: 14 }}>{amount(customer.balance)}</Text></Row>
      <Text style={label}>Payment instructions</Text>
      {shop.payment_instructions.map((line, index) => <Text key={index}>{line}</Text>)}
      {shop.contact && <Text>{shop.contact}</Text>}
      <Divider style={{ borderTop: ruled }} />
      <Text>Prepared from {shop.name}'s records as of {formatDate(asOf)}.</Text>
    </Column>
  </Document>;
}
Statement.PreviewProps = { summary: sample, customer: sampleCustomer };
