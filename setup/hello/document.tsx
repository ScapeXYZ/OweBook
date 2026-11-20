import React from "react";
import { Document, Text } from "@hyper-elements/react";

const fonts = [{ family: "Lato", src: "/fonts/Lato-Regular.ttf", format: "truetype" as const }];

export default function Hello({ message }: { message: string }) {
  return <Document size="A4" fonts={fonts} style={{ fontFamily: "Lato" }}><Text>{message}</Text></Document>;
}

Hello.PreviewProps = { message: "Hello from OweBook" };
