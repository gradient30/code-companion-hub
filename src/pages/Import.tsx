import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Download, CheckCircle2 } from "lucide-react";

export default function ImportPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const encoded = searchParams.get("data");
    if (encoded) {
      try {
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        setData(Array.isArray(decoded) ? decoded : []);
      } catch {
        toast({ title: "无效的导入链接", variant: "destructive" });
      }
    }
  }, [searchParams]);

  const handleImport = async () => {
    if (!user || data.length === 0) return;
    setImporting(true);
    let count = 0;
    for (const item of data) {
      const { error } = await supabase.from("providers").insert({
        ...item,
        user_id: user.id,
        sort_order: count,
      });
      if (!error) count++;
    }
    setImporting(false);
    setDone(true);
    toast({ title: `成功导入 ${count} 个 Provider` });
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>导入 Provider 配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground">无有效数据</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">即将导入 {data.length} 个 Provider：</p>
              <ul className="space-y-1">
                {data.map((d, i) => (
                  <li key={i} className="text-sm font-medium">{d.name} ({d.app_type})</li>
                ))}
              </ul>
              {done ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <Button onClick={() => navigate("/providers")}>前往 Provider 管理</Button>
                </div>
              ) : (
                <Button className="w-full" onClick={handleImport} disabled={importing}>
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  确认导入
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
