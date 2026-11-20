import React from "react";
import { Page, Text } from "@hyper-elements/react";

export default function Hello({ message }: { message: string }) {
  return <Page title="OweBook setup"><Text>{message}</Text></Page>;
}

Hello.PreviewProps = { message: "Hello from OweBook" };
