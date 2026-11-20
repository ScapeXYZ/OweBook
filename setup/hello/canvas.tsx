import React from "react";
import { Canvas, Text } from "@hyper-elements/react";

const fonts = [{ family: "Lato", src: "/fonts/Lato-Regular.ttf", format: "truetype" as const }];

export default function Hello({ message }: { message: string }) {
  return <Canvas width={1080} height={1080} fonts={fonts} style={{ fontFamily: "Lato" }}><Text>{message}</Text></Canvas>;
}

Hello.PreviewProps = { message: "Hello from OweBook" };
