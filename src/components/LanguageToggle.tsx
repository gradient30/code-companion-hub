import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const toggle = () => {
    const next = i18n.language === "zh" ? "en" : "zh";
    i18n.changeLanguage(next);
    localStorage.setItem("cc-switch-lang", next);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground"
      onClick={toggle}
      title={i18n.language === "zh" ? "English" : "中文"}
    >
      <Languages className="h-4 w-4" />
    </Button>
  );
}
