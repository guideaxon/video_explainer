import React from "react";
import { PScene, Headline, Tile, ChatList } from "@remotion-components/promo/kit";

export const TheyChatScene: React.FC<{ startFrame?: number }> = () => (
  <PScene>
    <Headline lines={["They *chat."]} y={220} size={124} />
    <Tile x={70} y={460} w={940} h={520} hue={215} live label="Host" from={10} />
    <ChatList x={70} y={1010} w={940} from={24} items={[{ name: "Maya", msg: "Hello from Denver!" }, { name: "Sam", msg: "Great question, thank you" }, { name: "Ana", msg: "Let's hit this goal" }]} />
  </PScene>
);
export default TheyChatScene;
