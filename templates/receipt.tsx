import { Column, Divider, Email, Heading, Row, Text, type EmailProps } from "@hyper-elements/react";
import type { Ledger, Payment, Summary } from "../core/ledger.js";
import { formatDate, money } from "../core/values.js";
import { sample, sampleCustomer, samplePayment } from "../kit/sample.js";
import { fills, label, redLine, ruled, theme } from "../kit/theme.js";

export default function Receipt({ summary, customer, payment, fonts }: { summary: Summary; customer: Ledger; payment: Payment; fonts?: EmailProps["fonts"] }) {
  const { shop } = summary;
  const amount = (value: number) => money(value, shop.currency);
  const date = formatDate(payment.date);
  return <Email width={600} lang="en" title="Payment recorded" previewText="Payment recorded in the shop's own records." theme={theme} fonts={fonts}>
    <Column style={{ padding: 24, border: { left: redLine }, gap: 14 }}>
      <Text style={label}>{shop.name}</Text>
      <Heading level={1} style={{ fontSize: 32 }}>Payment recorded</Heading>
      <Text>{customer.name} · {date}</Text>
      <Text style={{ padding: 14, fontSize: 32, textAlign: "right", fontWeight: 700, backgroundColor: fills[0] }}>{amount(payment.amount)}</Text>
      {payment.method && <Text>Method: {payment.method}</Text>}
      {payment.reference && <Text>Reference: {payment.reference}</Text>}
      <Divider style={{ borderTop: ruled }} />
      <Heading level={2} style={label}>Applied to</Heading>
      {payment.allocations.length === 0 && <Text>No open sales at the time of payment.</Text>}
      {payment.allocations.map(sale => <Row key={sale.id} style={{ gap: 10, border: { bottom: ruled }, padding: 5 }}>
        <Text>{sale.id} · {formatDate(sale.date)}{sale.note ? " · " + sale.note : ""}</Text><Text style={{ textAlign: "right" }}>{amount(sale.amount)}</Text>
      </Row>)}
      {payment.unapplied > 0 && <Text>Added to credit on account: {amount(-payment.unapplied)}</Text>}
      <Column style={{ gap: 2 }}><Divider style={{ borderTop: ruled }} /><Divider style={{ borderTop: ruled }} /></Column>
      <Row style={{ gap: 10 }}><Text style={label}>{payment.balance < 0 ? "Credit on account" : "Remaining balance"}</Text><Text style={{ textAlign: "right", fontWeight: 700 }}>{amount(payment.balance)}</Text></Row>
      <Text style={{ fontSize: 13 }}>This receipt confirms a payment recorded in {shop.name}'s own records on {date}. It has not been verified by a bank or payment provider.</Text>
    </Column>
  </Email>;
}
Receipt.PreviewProps = { summary: sample, customer: sampleCustomer, payment: samplePayment };
