import type { ReactNode } from "react";

type Props = {
  header: ReactNode;
  title: string;
  lede: string;
  children: ReactNode;
};

export function DashboardTemplate({ header, title, lede, children }: Props) {
  return (
    <>
      {header}
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 pt-8 pb-16 sm:px-6 lg:gap-10 lg:px-10 lg:pt-12">
        <div className="flex flex-col gap-3">
          <h1 className="text-4xl leading-[0.95] font-sidewall tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="max-w-[62ch] text-lg leading-snug text-pretty text-muted">
            {lede}
          </p>
        </div>
        {children}
      </main>
    </>
  );
}
