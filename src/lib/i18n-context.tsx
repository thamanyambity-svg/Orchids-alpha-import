"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import fr from "@/lib/locales/fr"
import en from "@/lib/locales/en"
import tr from "@/lib/locales/tr"
import zh from "@/lib/locales/zh"
import ja from "@/lib/locales/ja"
import ar from "@/lib/locales/ar"
import { siteLocales } from "@/lib/locales/site"

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
            document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr'
            document.documentElement.lang = saved
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem("app-language", lang)
        // Here we could also trigger a reload or update the html lang attribute
        document.documentElement.lang = lang
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    }

    // Les textes du site vitrine vivent dans leur propre module : ils sont
    // volumineux et purement éditoriaux, les garder à part rend la relecture
    // possible sans traverser les clés applicatives.
    const dictionaries: Record<Language, Record<string, string>> = {
        fr: { ...fr, ...siteLocales.fr },
        en: { ...en, ...siteLocales.en },
        tr: { ...tr, ...siteLocales.tr },
        zh: { ...zh, ...siteLocales.zh },
        ja: { ...ja, ...siteLocales.ja },
        ar: { ...ar, ...siteLocales.ar },
    }

    const t = (key: string, defaultText?: string) => {
        // Repli sur le français quand une langue n'a pas encore la clé : mieux
        // vaut un texte lisible dans une autre langue qu'un identifiant brut.
        return dictionaries[language]?.[key] || dictionaries.fr?.[key] || defaultText || key
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
