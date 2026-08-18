import { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import AntdThemeProvider from '@/components/providers/AntdThemeProvider';

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quản lý xưởng may BÌNH CANH",
  description: "Hệ thống quản lý sản xuất, tính lương và tồn kho xưởng may",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <AntdRegistry>
                <AntdThemeProvider fontFamily={outfit.style.fontFamily}>
                  {children}
                </AntdThemeProvider>
              </AntdRegistry>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
