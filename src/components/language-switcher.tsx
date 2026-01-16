"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Globe } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useLanguage, languages, Language } from "@/lib/i18n-context"

export function LanguageSwitcher() {
    const [open, setOpen] = React.useState(false)
    const { language, setLanguage } = useLanguage()

    const selectedLanguage = languages.find((l) => l.code === language)

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-16 h-9 px-2 gap-1 justify-between bg-background/50 border-input/50"
                >
                    <span className="text-lg leading-none pt-0.5">{selectedLanguage?.flag}</span>
                    <span className="sr-only">{selectedLanguage?.label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Choisir langue..." />
                    <CommandList>
                        <CommandEmpty>No language found.</CommandEmpty>
                        <CommandGroup>
                            {languages.map((lang) => (
                                <CommandItem
                                    key={lang.code}
                                    value={lang.code}
                                    onSelect={(currentValue) => {
                                        setLanguage(currentValue as Language)
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            language === lang.code ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="mr-2 text-lg">{lang.flag}</span>
                                    {lang.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
