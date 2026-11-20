import React from "react";
import { Email, Text } from "@hyper-elements/react";

export default function Hello({ message }: { message: string }) {
  return <Email width={600} title="OweBook setup" previewText="Hello from OweBook"><Text>{message}</Text></Email>;
}

Hello.PreviewProps = { message: "Hello from OweBook" };
