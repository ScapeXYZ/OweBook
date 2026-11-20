import { Canvas, Column, Divider, Heading, Row, Text } from "@hyper-elements/react";
import { bucket, type Ledger, type Summary } from "../core/ledger.js";
import { formatDate, money } from "../core/values.js";
import { sample, sampleCustomer } from "../kit/sample.js";
import { fills, label, redLine, ruled, theme } from "../kit/theme.js";

export default function Reminder({ summary, customer }: { summary: Summary; customer: Ledger }) {
  const { shop, asOf } = summary;
  if (customer.tier === "none") throw new Error("Reminder requires an overdue balance");
  const overdue = money(customer.overdue, shop.currency);
  const n = customer.oldest;
  const copy = {
    friendly: ["A friendly reminder", overdue + " is " + n + " " + (n === 1 ? "day" : "days") + " past its due date. If you have already paid, thank you, and please let us know."],
    overdue_notice: ["Payment overdue", overdue + " is " + n + " days past due. Please arrange payment using the details below."],
    contact_us: ["Please get in touch", overdue + " has been overdue for " + n + " days. Please contact us so we can agree a way to settle it."]
  }[customer.tier];
  return <Canvas width={1080} height={1080} title="Payment reminder" lang="en" theme={theme} style={{ padding: 72, fontFamily: "Lato", fontSize: 26 }}>
    <Column style={{ border: { left: redLine }, padding: 30, gap: 23 }}>
      <Text style={{ ...label, fontSize: 22 }}>{shop.name}</Text>
      <Divider style={{ borderTop: ruled }} />
      <Text>{customer.name}</Text>
      <Heading level={1} style={{ fontSize: 50, fontWeight: 700 }}>{copy[0]}</Heading>
      <Column style={{ backgroundColor: fills[bucket(n)], padding: 26, gap: 8 }}>
        <Text style={{ ...label, fontSize: 22 }}>Overdue amount</Text>
        <Text style={{ fontSize: 66, fontWeight: 700, textAlign: "right" }}>{overdue}</Text>
        <Text style={{ textAlign: "right", fontSize: 22 }}>{n} {n === 1 ? "day" : "days"} overdue</Text>
      </Column>
      <Text style={{ fontSize: 30 }}>{copy[1]}</Text>
      <Column style={{ gap: 3 }}><Divider style={{ borderTop: ruled }} /><Divider style={{ borderTop: ruled }} /></Column>
      <Row><Text style={{ ...label, fontSize: 22 }}>Total outstanding</Text><Text style={{ textAlign: "right" }}>{money(customer.balance, shop.currency)}</Text></Row>
      <Text style={{ ...label, fontSize: 22 }}>Payment instructions</Text>
      {shop.payment_instructions.map((line, index) => <Text key={index} style={{ fontSize: 22 }}>{line}</Text>)}
      <Text style={{ fontSize: 22 }}>Prepared from {shop.name}'s records as of {formatDate(asOf)}.</Text>
    </Column>
  </Canvas>;
}
Reminder.PreviewProps = { summary: sample, customer: sampleCustomer };
