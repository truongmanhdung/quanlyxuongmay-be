import React from "react";
import Link from "next/link";

export default function StatCard({
  icon,
  label,
  value,
  caption,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption?: string;
  href?: string;
}) {
  const content = (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 ${
        href ? "transition-colors hover:border-brand-300 dark:hover:border-brand-700" : ""
      }`}
    >
      <div className="flex items-center justify-center w-12 h-12 bg-brand-50 rounded-xl dark:bg-brand-500/[0.12]">
        {icon}
      </div>
      <div className="mt-5">
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
          {value}
          {caption && <span className="ml-1.5 text-sm font-normal text-gray-400 dark:text-gray-500">{caption}</span>}
        </h4>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
