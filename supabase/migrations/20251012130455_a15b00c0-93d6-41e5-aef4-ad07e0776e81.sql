-- Add email column to employees table
ALTER TABLE public.employees 
ADD COLUMN email TEXT UNIQUE;

-- Add index for email lookups
CREATE INDEX idx_employees_email ON public.employees(email);

-- Update RLS policies remain the same as email is just another employee field