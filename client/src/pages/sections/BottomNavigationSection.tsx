import { HomeIcon, SearchIcon, UserIcon } from "lucide-react";
import React from "react";

const navigationItems = [
  {
    icon: HomeIcon,
    label: "Home",
    isActive: true,
    textColor: "text-[#6cc2c2]",
    fontFamily: "[font-family:'Clash_Display-Semibold',Helvetica]",
  },
  {
    icon: SearchIcon,
    label: "Learn",
    isActive: false,
    textColor: "text-[#92979f]",
    fontFamily: "[font-family:'Clash_Display-Regular',Helvetica]",
  },
  {
    icon: UserIcon,
    label: "Profile",
    isActive: false,
    textColor: "text-[#92979f]",
    fontFamily: "[font-family:'Clash_Display-Regular',Helvetica]",
  },
];

export const BottomNavigationSection = (): JSX.Element => {
  return (
    <nav className="w-full h-[103px] flex flex-col justify-end bg-[#f5f6f7] rounded-3xl overflow-hidden">
      <div className="flex w-full h-[73px] items-center justify-center px-3 py-2 bg-white">
        {navigationItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <button
              key={index}
              className="flex flex-col items-center gap-1.5 flex-1 grow h-auto"
            >
              <IconComponent
                className={`w-6 h-6 ${item.isActive ? "text-[#6cc2c2]" : "text-[#92979f]"}`}
              />
              <span
                className={`w-fit ${item.fontFamily} font-normal ${item.textColor} text-xs tracking-[0] leading-4 whitespace-nowrap`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="w-full h-[30px] flex items-end justify-center bg-white">
        <div className="mb-2 w-[135px] h-[5px] bg-[#b8bfc8] rounded-[100px]" />
      </div>
    </nav>
  );
};
