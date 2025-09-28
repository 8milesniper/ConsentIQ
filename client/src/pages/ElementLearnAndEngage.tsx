import React from "react";
import { BottomNavigationSection } from "./sections/BottomNavigationSection";
import { ContentFrameSection } from "./sections/ContentFrameSection";

export const ElementLearnAndEngage = (): JSX.Element => {
  return (
    <main className="bg-[#ebf0f6] overflow-hidden w-full min-w-[390px] min-h-[844px] flex flex-col relative">
      <ContentFrameSection />
      <BottomNavigationSection />
    </main>
  );
};
