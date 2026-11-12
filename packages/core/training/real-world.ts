import type { Example } from "./dataset";

/** Written separately from the templates and never trained on: how students actually type. Used only to grade the model. */
export const REAL_WORLD: Example[] = [
  // attendance
  { text: "how much attendance i have in dbms", intent: "attendance" },
  { text: "dbms attendance?", intent: "attendance" },
  { text: "whats my attendence", intent: "attendance" },
  { text: "show attendance of flat", intent: "attendance" },
  { text: "is my attendance fine", intent: "attendance" },
  { text: "fsd %", intent: "attendance" },
  { text: "how many cn classes did i miss", intent: "attendance" },
  // can_skip
  { text: "how many classes of my DBMS can I skip", intent: "can_skip" },
  { text: "can i bunk cn lab", intent: "can_skip" },
  { text: "how many bunks left in emf", intent: "can_skip" },
  { text: "how many more fsd classes can i skip without going below 75", intent: "can_skip" },
  { text: "can i skip flat classes", intent: "can_skip" },
  { text: "no of classes i can miss in pd", intent: "can_skip" },
  // cost_of_skip
  { text: "what if i skip fsd", intent: "cost_of_skip" },
  { text: "if i dont attend emf tomorrow what will happen to my attendance", intent: "cost_of_skip" },
  { text: "how much will dbms drop if i bunk", intent: "cost_of_skip" },
  { text: "skipping cn effect on percentage", intent: "cost_of_skip" },
  // should_skip_day
  { text: "can i skip tomorrow", intent: "should_skip_day" },
  { text: "should i bunk on friday", intent: "should_skip_day" },
  { text: "is it fine if i dont come tomorrow", intent: "should_skip_day" },
  { text: "can i skip dbms tomorrow", intent: "should_skip_day" },
  { text: "can i take a day off on monday", intent: "should_skip_day" },
  // next_class
  { text: "when is my next class", intent: "next_class" },
  { text: "next dbms class when", intent: "next_class" },
  { text: "what's my next period", intent: "next_class" },
  { text: "what lecture is next", intent: "next_class" },
  // day_schedule
  { text: "do i have class tmrw", intent: "day_schedule" },
  { text: "what all classes are there on friday", intent: "day_schedule" },
  { text: "monday schedule", intent: "day_schedule" },
  { text: "what is there at 2pm tomorrow", intent: "day_schedule" },
  { text: "is there fsd on wednesday", intent: "day_schedule" },
  { text: "what time does college start tomorrow", intent: "day_schedule" },
  // free_time
  { text: "when am i free tomorrow", intent: "free_time" },
  { text: "do i get any free period today", intent: "free_time" },
  { text: "free slots on friday", intent: "free_time" },
  { text: "when can i study tomorrow", intent: "free_time" },
  // instructor
  { text: "who teaches dbms", intent: "instructor" },
  { text: "who is the faculty of fsd", intent: "instructor" },
  { text: "cn lab teacher", intent: "instructor" },
  { text: "who is our class advisor", intent: "instructor" },
  { text: "flat sir name?", intent: "instructor" },
  // room
  { text: "where is cn lab", intent: "room" },
  { text: "which room is dbms in", intent: "room" },
  { text: "where's my next class", intent: "room" },
  { text: "room no for flat", intent: "room" },
  // deadlines
  { text: "any assignments due", intent: "deadlines" },
  { text: "when is the dbms quiz", intent: "deadlines" },
  { text: "what all deadlines this week", intent: "deadlines" },
  { text: "do i have any submissions", intent: "deadlines" },
  // events
  { text: "events on 14th", intent: "events" },
  { text: "what's happening this week", intent: "events" },
  { text: "when is the ptm", intent: "events" },
  { text: "any events coming up", intent: "events" },
  // holidays
  { text: "next holiday", intent: "holidays" },
  { text: "is monday a holiday", intent: "holidays" },
  { text: "any holidays coming", intent: "holidays" },
  { text: "when is christmas holiday", intent: "holidays" },
  // exams
  { text: "when is cie 2", intent: "exams" },
  { text: "when do semester exams start", intent: "exams" },
  { text: "lab test dates", intent: "exams" },
  { text: "when is the theory exam", intent: "exams" },
  // projection
  { text: "what will my dbms attendance be by sem end", intent: "projection" },
  { text: "how many classes are left in fsd", intent: "projection" },
  { text: "if i attend all remaining classes what will i get", intent: "projection" },
  { text: "final attendance projection", intent: "projection" },
  // open_section / open_classroom
  { text: "open planner", intent: "open_section" },
  { text: "take me to settings", intent: "open_section" },
  { text: "go to the calendar", intent: "open_section" },
  { text: "open classroom for fsd", intent: "open_classroom" },
  { text: "fsd classroom", intent: "open_classroom" },
  // help / out_of_scope
  { text: "hi", intent: "help" },
  { text: "what can you help me with", intent: "help" },
  { text: "thanks!", intent: "help" },
  { text: "explain normalization", intent: "out_of_scope" },
  { text: "tell me a joke", intent: "out_of_scope" },
  { text: "give me dbms notes", intent: "out_of_scope" },
  { text: "what is the weather", intent: "out_of_scope" },
];
