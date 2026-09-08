"use client"

import * as React from "react"
import { ThemeProvider } from "next-themes"
import { LanguageProvider } from "@/lib/i18n-context"
import { Toaster } from "@/components/ui/sonner"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            storageKey="app-theme"
        >
            <LanguageProvider>
                {children}
                <Toaster position="top-right" />
            </LanguageProvider>
        </ThemeProvider>
    )
}
