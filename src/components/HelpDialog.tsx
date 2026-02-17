import { HelpCircle, Lightbulb, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

interface HelpSection {
  title: string;
  content: string;
  tip?: string;
}

interface HelpDialogProps {
  sections: HelpSection[];
}

export function HelpDialog({ sections }: HelpDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-colors">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            {t("help.title")}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {sections.map((section, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    {section.title}
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed pl-5">
                    {section.content}
                  </p>
                  {section.tip && (
                    <div className="flex items-start gap-2 mt-2 ml-5 rounded-md bg-primary/5 border border-primary/10 p-2.5">
                      <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground leading-relaxed">{section.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
