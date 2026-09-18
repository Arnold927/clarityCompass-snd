"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface TaskDatePickerProps {
  value?: Date;
  onChange: (date?: Date) => void;
  placeholder?: string;
}

export function TaskDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
}: TaskDatePickerProps) {

  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("justify-start text-left font-normal w-full",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="p-0 w-auto"
        sideOffset={4}
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
          captionLayout="dropdown-buttons"
          fromYear={2010}
          toYear={2040}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}