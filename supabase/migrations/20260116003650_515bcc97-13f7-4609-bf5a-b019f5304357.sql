-- Table to store daily AI predictions
CREATE TABLE public.daily_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_date DATE NOT NULL,
  matches JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prediction_date)
);

-- Table to store yesterday's results with outcomes
CREATE TABLE public.prediction_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prediction_date DATE NOT NULL,
  matches_with_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(prediction_date)
);

-- Enable RLS but allow public read (predictions are public)
ALTER TABLE public.daily_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_results ENABLE ROW LEVEL SECURITY;

-- Public can read predictions
CREATE POLICY "Anyone can view daily predictions" 
ON public.daily_predictions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view prediction results" 
ON public.prediction_results 
FOR SELECT 
USING (true);

-- Service role can insert/update (for edge function)
CREATE POLICY "Service can manage predictions" 
ON public.daily_predictions 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Service can manage results" 
ON public.prediction_results 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_daily_predictions_updated_at
BEFORE UPDATE ON public.daily_predictions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;