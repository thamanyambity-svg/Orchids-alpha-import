"use client"

import * as React from "react"
import { LanguageProvider } from "@/lib/i18n-context"
import { Toaster } from "sonner"

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <LanguageProvider>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: 'oklch(0.10 0.015 260)',
                        border: '1px solid oklch(0.22 0.02 260)',
                        color: 'oklch(0.95 0.01 260)',
                    },
                }}
            />
        </LanguageProvider>
    )
}
