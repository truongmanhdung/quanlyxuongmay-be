"use client";

import React from "react";
import { ConfigProvider, theme as antdTheme } from "antd";
import viVN from "antd/locale/vi_VN";
import { useTheme } from "@/context/ThemeContext";

export default function AntdThemeProvider({
  children,
  fontFamily,
}: {
  children: React.ReactNode;
  fontFamily: string;
}) {
  const { theme } = useTheme();

  return (
    <ConfigProvider
      locale={viVN}
      theme={{
        algorithm: theme === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#465fff",
          borderRadius: 8,
          fontFamily,
          // Modal tu viet cua project dung z-99999 (xem src/components/ui/modal) - phai vuot qua
          // no thi dropdown/DatePicker cua antd moi hien dung khi mo ben trong modal
          zIndexPopupBase: 100000,
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}
