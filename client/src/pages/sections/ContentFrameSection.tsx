import { PlayIcon, SearchIcon } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const featuredArticles = [
  {
    id: 1,
    image: "/figmaAssets/image-17.png",
    imageTop: "top-[-47px]",
    imageLeft: "left-[-3px]",
    title: "Intimacy Unveiled: The Science and Ethics of Safe, Consensual Sex",
    description:
      "Exploring the Boundaries of Pleasure: A Comprehensive Look at Sexual Health and Respect",
    actionIcon: "/figmaAssets/frame-1000002022.svg",
  },
  {
    id: 2,
    image: "/figmaAssets/image-17-1.png",
    imageTop: "top-[-63px]",
    imageLeft: "left-[-3px]",
    title:
      "Beyond Taboo: Navigating Safe and Consensual Intimacy in Today's World",
    description:
      "Breaking Silence, Building Trust: Insights into Healthy and Respectful Sexual Encounters",
    actionIcon: "/figmaAssets/frame-1000002022-1.svg",
  },
];

const quickTips = [
  {
    id: 1,
    title: "Have you asked?",
    description:
      "Asking questions about what your partner likes can still be sexy.",
    width: "w-[207px]",
    marginRight: "",
    backgroundColor: "bg-white",
    borderRadius: "rounded-3xl",
  },
  {
    id: 2,
    title: "Safe Words",
    description:
      "Creating a clear signal for halting or adjusting sexual activity instantly",
    width: "w-[207px]",
    marginRight: "mr-[-80.00px]",
    backgroundColor: "bg-white",
    borderRadius: "rounded-3xl",
  },
  {
    id: 3,
    title: "Lorem ipsum dolor sit amet",
    description:
      "Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.",
    width: "w-[191px]",
    marginRight: "mr-[-287.00px]",
    backgroundColor: "bg-[#f7f7f7]",
    borderRadius: "rounded-lg",
  },
];

const safePractices = [
  {
    id: 1,
    image: "/figmaAssets/frame-691316483-1.svg",
    title: "Open Communication",
    description: "Clearly communicate and set boundaries with your partner.",
  },
  {
    id: 2,
    image: "/figmaAssets/frame-691316483.svg",
    title: "Consent is Fluid",
    description:
      "Respecting boundaries means acknowledging the right to change your mind",
  },
];

export const ContentFrameSection = (): JSX.Element => {
  return (
    <div className="flex h-[717px] items-start gap-2.5 w-full overflow-y-scroll">
      <div className="relative w-[390px] h-[1977px]">
        <img
          className="absolute top-0 left-0 w-[390px] h-[159px]"
          alt="Frame"
          src="/figmaAssets/frame-1.svg"
        />

        <div className="flex flex-col items-start gap-10 absolute top-[70px] left-5">
          <div className="flex flex-col w-[350px] items-start gap-6 relative flex-[0_0_auto]">
            <h1 className="relative self-stretch mt-[-1.00px] [font-family:'Clash_Display-Bold',Helvetica] font-bold text-white text-2xl text-center tracking-[0] leading-9">
              Learn and Engage
            </h1>

            <div className="flex h-14 items-center justify-center gap-2 px-4 py-3 relative self-stretch w-full bg-white rounded-[88px]">
              <SearchIcon className="w-6 h-6 text-[#787878]" />

              <Input
                className="flex-1 border-0 bg-transparent [font-family:'Clash_Display-Regular',Helvetica] font-normal text-[#787878] text-base tracking-[0] leading-[normal] placeholder:text-[#787878] focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                placeholder="SearchIcon Resources"
              />

              <img
                className="relative w-10 h-10 mt-[-4.00px] mb-[-4.00px]"
                alt="Frame"
                src="/figmaAssets/frame-1261153072.svg"
              />
            </div>
          </div>

          <section className="flex flex-col w-[350px] items-start gap-4 relative flex-[0_0_auto]">
            <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Clash_Display-Semibold',Helvetica] font-normal text-[#212121] text-xl tracking-[0] leading-[30px]">
              Featured consent articles
            </h2>

            <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
              {featuredArticles.map((article) => (
                <Card
                  key={article.id}
                  className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] rounded-3xl overflow-hidden border-0 shadow-none"
                >
                  <CardContent className="p-0 w-full">
                    <div className="relative self-stretch w-full h-[165px] bg-[url(/figmaAssets/image-1.png)] bg-cover bg-[50%_50%]">
                      <img
                        className={`absolute ${article.imageTop} ${article.imageLeft} w-[354px] h-[236px] object-cover`}
                        alt="Image"
                        src={article.image}
                      />
                    </div>

                    <div className="flex flex-col items-start gap-2 p-4 relative self-stretch w-full flex-[0_0_auto] bg-white">
                      <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto]">
                        <h3 className="relative self-stretch mt-[-1.00px] [font-family:'Clash_Display-Semibold',Helvetica] font-normal text-[#212121] text-lg tracking-[0] leading-[25.2px]">
                          {article.title}
                        </h3>

                        <p className="relative self-stretch [font-family:'Clash_Display-Regular',Helvetica] font-normal text-[#979797] text-sm tracking-[0] leading-[19.6px]">
                          {article.description}
                        </p>
                      </div>

                      <div className="flex items-start justify-between relative self-stretch w-full flex-[0_0_auto]">
                        <Button
                          variant="ghost"
                          className="h-auto inline-flex flex-col items-start px-4 py-2 relative flex-[0_0_auto] bg-[#0000000d] rounded-[34px] backdrop-blur-[43.85px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(43.85px)_brightness(100%)] hover:bg-[#0000001a]"
                        >
                          <div className="flex items-center gap-2 relative self-stretch w-full flex-[0_0_auto]">
                            <span className="relative w-fit mt-[-0.50px] [font-family:'Clash_Display-Semibold',Helvetica] font-normal text-black text-[15px] tracking-[0] leading-[22.5px] whitespace-nowrap">
                              Listen to article
                            </span>

                            <PlayIcon className="w-6 h-6 text-black" />
                          </div>
                        </Button>

                        <img
                          className="relative flex-[0_0_auto]"
                          alt="Frame"
                          src={article.actionIcon}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="flex flex-col w-[350px] items-start gap-4 relative flex-[0_0_auto]">
            <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Clash_Display-Semibold',Helvetica] font-normal text-[#212121] text-xl tracking-[0] leading-[30px]">
              Quick tips
            </h2>

            <div className="flex items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
              {quickTips.map((tip) => (
                <Card
                  key={tip.id}
                  className={`flex flex-col ${tip.width} items-start gap-4 p-4 relative ${tip.marginRight} ${tip.backgroundColor} ${tip.borderRadius} border-0 shadow-none`}
                >
                  <CardContent className="p-0 w-full flex flex-col gap-4">
                    <h3
                      className={`relative self-stretch mt-[-1.00px] ${tip.id === 3 ? "[font-family:'Inter',Helvetica] font-medium" : "[font-family:'Clash_Display-Semibold',Helvetica] font-normal"} text-[#212121] ${tip.id === 3 ? "text-xl" : "text-lg"} tracking-[0] ${tip.id === 3 ? "leading-7" : "leading-[25.2px]"}`}
                    >
                      {tip.title}
                    </h3>

                    <p
                      className={`relative self-stretch ${tip.id === 3 ? "[font-family:'Inter',Helvetica] font-normal text-base leading-[22.4px]" : "[font-family:'Clash_Display-Medium',Helvetica] font-medium text-[13px] leading-[18.2px]"} text-[#979797] tracking-[0]`}
                    >
                      {tip.description}
                    </p>

                    <img
                      className="relative flex-[0_0_auto]"
                      alt="Frame"
                      src={
                        tip.id === 3
                          ? "/figmaAssets/frame-1000002680.svg"
                          : "/figmaAssets/frame-1261153241.svg"
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="flex flex-col w-[350px] items-start gap-4 relative flex-[0_0_auto]">
            <h2 className="text-xl leading-[30px] relative self-stretch mt-[-1.00px] [font-family:'Clash_Display-Semibold',Helvetica] font-normal text-[#212121] tracking-[0]">
              Safe practices
            </h2>

            <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
              {safePractices.map((practice) => (
                <Card
                  key={practice.id}
                  className="flex flex-col items-start relative self-stretch w-full flex-[0_0_auto] rounded-3xl overflow-hidden border-0 shadow-none"
                >
                  <CardContent className="p-0 w-full">
                    <img
                      className="relative self-stretch w-full h-[165px]"
                      alt="Frame"
                      src={practice.image}
                    />

                    <div className="flex flex-col items-start gap-1 p-4 relative self-stretch w-full flex-[0_0_auto] bg-white">
                      <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto]">
                        <h3 className="relative self-stretch mt-[-1.00px] [font-family:'Clash_Display-Semibold',Helvetica] font-normal text-[#212121] text-lg tracking-[0] leading-[25.2px]">
                          {practice.title}
                        </h3>

                        <p className="relative self-stretch [font-family:'Clash_Display-Regular',Helvetica] font-normal text-[#979797] text-sm tracking-[0] leading-[19.6px]">
                          {practice.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
