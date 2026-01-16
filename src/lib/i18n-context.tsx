"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type Language = "fr" | "en" | "tr" | "zh" | "ja" | "ar"

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string, defaultText?: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const languages = [
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "tr", label: "Türkçe", flag: "🇹🇷" },
    { code: "zh", label: "中文 (Mandarin)", flag: "🇨🇳" },
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "ar", label: "العربية", flag: "🇸🇦" },
]

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("fr")

    useEffect(() => {
        const saved = localStorage.getItem("app-language") as Language
        if (saved && languages.find(l => l.code === saved)) {
            setLanguage(saved)
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem("app-language", lang)
        // Here we could also trigger a reload or update the html lang attribute
        document.documentElement.lang = lang
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    }

    // Placeholder translation function
    // In a real app, this would look up keys in dictionaries
    const t = (key: string, defaultText?: string) => {
        return defaultText || key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
