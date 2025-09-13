"use client";

import { format } from "date-fns";
import { CalendarIcon, Clock2Icon } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "../button";
import { Calendar } from "../calendar";
import { Card, CardContent, CardFooter } from "../card";
import { Input } from "../input";
import { Label } from "../label";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";

export function DateTimePicker() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [isOpen, setIsOpen] = React.useState(false);
  const [time, setTime] = React.useState("12:00");

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
  };

  const handleTimeChange = (newTime: string) => {
    setTime(newTime);
  };

  const getDisplayValue = () => {
    if (date) {
      return `${format(date, "MM/dd/yyyy")} ${time}`;
    }
    return "MM/DD/YYYY HH:MM";
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayValue()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Card className="w-fit py-4 border-0 shadow-none">
          <CardContent className="px-4">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              className="bg-transparent p-0"
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t px-4 !pt-4">
            <div className="flex w-full flex-col gap-3">
              <Label htmlFor="time">Time</Label>
              <div className="relative flex w-full items-center gap-2">
                <Clock2Icon className="text-muted-foreground pointer-events-none absolute left-2.5 size-4 select-none" />
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="appearance-none pl-8 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
              </div>
            </div>
          </CardFooter>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
