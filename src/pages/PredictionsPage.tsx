import { DailyPredictions } from "@/components/predictions/DailyPredictions";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";

export default function PredictionsPage() {
  const [loading, setLoading] = useState(false);

  const handleManualRun = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/daily-predictions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );

      const data = await response.json();
      
      if (data.success) {
        toast.success("Predicțiile au fost generate!");
        window.location.reload();
      } else {
        toast.error(data.message || "Eroare la generare");
      }
    } catch (err) {
      console.error(err);
      toast.error("Eroare la generarea predicțiilor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Înapoi la Chat
            </Button>
          </Link>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleManualRun}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Se generează..." : "Generează Manual"}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="pb-8">
        <DailyPredictions />
      </main>

      {/* Footer info */}
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        <p>⏰ Predicțiile se generează automat zilnic la ora 05:00</p>
        <p className="mt-1">Powered by Anisia AI • Monte Carlo Engine</p>
      </footer>
    </div>
  );
}
