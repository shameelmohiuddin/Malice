import type { ModelIntent } from "../src/assistant/model/net";
import type { Course } from "../src/assistant/subjects";

/** Subjects used only to fill templates (any college's courses: the model must not memorise MITE's). */
export const POOL: Course[] = [
  "Database Management System", "Computer Networks", "Computer Networks Laboratory", "Formal Language and Automata Theory",
  "Full Stack Development", "Product Development", "Entrepreneurship, Management & Finance", "Internet of Things",
  "Operating Systems", "Data Structures", "Design and Analysis of Algorithms", "Machine Learning", "Artificial Intelligence",
  "Engineering Mathematics", "Maths", "Physics", "Chemistry", "Software Engineering", "Compiler Design", "Cloud Computing",
  "Cyber Security", "Digital Electronics", "Microcontrollers", "Java Programming", "Python Programming Laboratory",
  "Physical Education", "Environmental Studies", "Data Science", "Web Technologies", "Computer Graphics",
].map((name, i) => ({ code: `23XX${String(100 + i)}`, name }));

/** How a student might write each subject. */
export const SUBJECTS = [
  "dbms", "DBMS", "database management system", "database", "cn", "CN", "computer networks", "networks", "cn lab", "computer networks lab",
  "flat", "FLAT", "automata", "automata theory", "fsd", "FSD", "full stack", "full stack development", "pd", "product development",
  "emf", "EMF", "entrepreneurship", "iot", "IOT", "internet of things", "os", "operating systems", "ds", "data structures", "daa",
  "algorithms", "ml", "machine learning", "ai", "artificial intelligence", "maths", "math", "engineering mathematics", "physics",
  "chemistry", "se", "software engineering", "compiler design", "cloud computing", "cyber security", "digital electronics",
  "microcontrollers", "java", "python lab", "pe", "physical education", "evs", "environmental studies", "data science", "web technologies", "graphics",
];
export const DATES = [
  "today", "tomorrow", "tmrw", "tmr", "on friday", "friday", "this friday", "on monday", "next monday", "monday", "on tuesday", "wednesday",
  "on thursday", "saturday", "on saturday", "day after tomorrow", "on 14th", "on the 20th", "on 3rd", "20 nov", "on 2 dec", "dec 5", "on 18 november",
];
export const TIMES = ["2pm", "at 2pm", "10:15", "at 11:10", "9 am", "at 12:50", "3 pm", "1:45"];
const FILLER_START = ["", "", "", "", "hey ", "hi ", "bro ", "pls ", "can you tell me ", "tell me ", "yo ", "ok "];
const FILLER_END = ["", "", "", "", "?", " ?", " pls", " please", " bro", " now", "??"];

type T = string;
/** Templates per intent. {S} subject, {D} date, {T} time. Kept varied on purpose: the held-out split is by template. */
export const TEMPLATES: Record<ModelIntent, T[]> = {
  attendance: [
    "{S} attendance", "what is my {S} attendance", "whats my attendance in {S}", "my attendance", "what's my attendance",
    "show my attendance", "attendance percentage", "how much attendance do i have in {S}", "{S} percentage", "how am i doing in {S}",
    "attendance status", "what is my overall attendance", "attendance report", "attendance summary", "my overall attendance", "attendance of all subjects", "my % in {S}", "overall percentage", "how many {S} classes have i attended",
    "how many classes did i attend in {S}", "{S} attendance kitna hai", "check my {S} attendance", "attendance for {S}",
    "how many {S} classes have i missed", "how many classes have i missed so far", "my percent in {S}", "what's my % in {S}",
    "am i safe in {S}", "is my {S} attendance ok", "am i above 75 in {S}", "am i short of attendance", "do i have enough attendance",
    "attendance in all subjects", "{S}", "{S}?", "how is my attendance looking", "total attendance", "am i below 75 percent anywhere",
  ],
  can_skip: [
    "how many classes can i skip in {S}", "how many {S} classes can i bunk", "can i bunk {S}", "can i skip {S}", "how many more can i miss in {S}",
    "how many {S} classes can i miss", "bunk count for {S}", "how many leaves can i take in {S}", "can i afford to miss {S}",
    "how many {S} lectures can i skip", "how many skips left in {S}", "how many bunks do i have left", "how many classes can i bunk",
    "how many classes can i skip", "skips remaining in {S}", "how many can i skip in {S}", "can i still bunk {S} classes",
    "how many {S} classes can i afford to miss", "how many absents can i have in {S}", "how many {S} can i bunk and stay above 75",
    "how many more bunks in {S}", "bunks left in {S}", "can i skip any {S} class", "is it ok to bunk {S}", "how many {S} sessions can i skip", "how many {S} classes can i still skip", "how many leaves left in {S}", "bunks available in {S}",
    "safe to miss how many {S}", "how many days can i be absent for {S}", "can i take leave from {S}",
  ],
  cost_of_skip: [
    "what if i skip {S}", "what happens if i skip {S}", "if i miss {S} what will my attendance be", "how much will my attendance drop if i skip {S}",
    "what will my {S} attendance be if i bunk the next class", "if i bunk {S} once", "effect of skipping {S}", "what if i miss the next {S} class",
    "how much do i lose if i skip {S}", "if i skip one {S} class", "what happens to my {S} percentage if i bunk",
    "will my attendance go below 75 if i skip {S}", "how much percent will i lose by missing {S}", "what does one more absence do to {S}",
    "if i am absent for {S} tomorrow what happens", "percentage after skipping {S}", "drop if i miss {S}", "how much does my {S} percent drop if i skip once", "what will {S} become if i miss one", "if i dont attend {S} what happens to my percentage",
  ],
  should_skip_day: [
    "can i skip {D}", "should i skip {D}", "can i bunk {D}", "can i skip classes {D}", "should i go to college {D}", "can i take leave {D}",
    "is it safe to skip {D}", "can i miss classes {D}", "can i skip {S} {D}", "should i bunk {S} {D}", "can i skip {D} classes",
    "can i miss {S} {D}", "is it ok to not go {D}", "can i stay home {D}", "should i attend {D}", "which classes can i skip {D}",
    "can i bunk the whole day {D}", "can i skip all classes {D}", "is it a good idea to skip {D}", "can i not come {D}", "is skipping {D} a problem", "can i be absent {D}", "can i leave early {D}",
  ],
  next_class: [
    "when is my next class", "next class", "what is my next class", "whats next", "what's my next lecture", "when is my next {S} class",
    "next {S} class", "when do i have {S} next", "what class is next", "what's coming up next", "upcoming class",
    "when is the next {S} lecture", "which class do i have now", "what class do i have now", "current class", "what's after this",
    "next period", "when is {S} lab next", "upcoming lecture", "what is the next lecture", "when is {S} next", "my next lab", "when is my next lab",
  ],
  day_schedule: [
    "what classes do i have {D}", "do i have class {D}", "do i have classes {D}", "{D} timetable", "timetable for {D}", "schedule for {D}",
    "what is my schedule {D}", "show {D} classes", "classes {D}", "what's on {D}", "do i have {S} {D}", "is there {S} class {D}",
    "how many classes {D}", "what time do classes start {D}", "when does college end {D}", "what time do i finish {D}",
    "first class {D}", "last class {D}", "what's my timetable {D}", "is there college {D}", "do we have lab {D}", "when is {S} {D}",
    "what do i have at {T} {D}", "what class is at {T}", "which class is at {T} {D}", "what's at {T}", "full day schedule {D}", "{D} schedule", "classes on {D}", "what is the last class {D}", "what's at {T} {D}", "list my classes {D}",
  ],
  free_time: [
    "when am i free {D}", "free periods {D}", "do i have any free period {D}", "when do i have free time {D}", "any gaps {D}",
    "when can i study {D}", "free slots {D}", "am i free at {T} {D}", "am i free at {T}", "do i have a break {D}", "when is lunch {D}",
    "free hours {D}", "when is my free period", "any free time {D}", "when am i done {D}", "when do i have a gap {D}", "free time {D}", "is there lunch break {D}", "when can i go to the library {D}", "what time am i free after college {D}",
  ],
  instructor: [
    "who teaches {S}", "who is the {S} teacher", "who takes {S}", "{S} faculty", "who is my {S} lecturer", "{S} teacher name",
    "who handles {S}", "{S} sir name", "{S} mam name", "who is the faculty for {S}", "who teaches {S} lab", "who is our class advisor",
    "class advisor", "who is my class teacher", "who is the class coordinator", "name of {S} professor", "who is taking {S} this sem",
    "which teacher takes {S}", "{S} madam", "who's the {S} prof", "{S} lecturer", "teacher for {S}", "who takes {S} lab", "who teaches the {S} class",
  ],
  room: [
    "where is my next class", "which room is {S}", "where is {S}", "{S} room number", "where is the {S} lab", "which classroom for {S}",
    "room for {S} {D}", "where do i go for {S}", "which room is my next class in", "where is the lab", "where is {S} {D}",
    "which lab is {S} in", "what room is the {T} class", "location of {S} class", "which hall is {S}", "{S} room", "room of {S}", "where is {S} held", "which room {D}", "where's my next lecture",
  ],
  deadlines: [
    "what is due this week", "any deadlines", "my deadlines", "upcoming deadlines", "when is the {S} quiz", "when is my {S} assignment due",
    "what assignments are due", "any quizzes this week", "when is {S} submission", "pending assignments", "what's due {D}",
    "do i have any assignments", "{S} assignment deadline", "when is the next quiz", "any tests coming up for {S}", "what do i need to submit",
    "deadlines {D}", "is anything due {D}", "when is my {S} exam due", "homework due", "upcoming deadlines", "deadlines this week", "anything due soon", "submissions pending", "due dates",
  ],
  events: [
    "events this week", "any events", "what's happening {D}", "events {D}", "what events are coming up", "anything happening this week",
    "college events", "is there any event {D}", "upcoming events", "what's on the calendar", "calendar events", "when is ptm",
    "when is the parent teacher meeting", "any fest", "when is the class committee meeting", "what's happening in college",
    "events on {D}", "show me the calendar", "what is planned this month", "any program {D}", "events this month", "what's coming up in college", "any functions {D}", "show events",
  ],
  holidays: [
    "next holiday", "when is the next holiday", "is {D} a holiday", "any holidays this month", "holidays", "upcoming holidays",
    "is there a holiday {D}", "is college closed {D}", "when is the next leave", "holiday list", "is {D} off", "are there holidays next week",
    "when is diwali holiday", "is christmas a holiday", "do we have a holiday {D}", "when do we get a break", "long weekend", "holidays this month", "is {D} a holiday or not", "any leave {D}", "holiday on {D}", "college closed {D}",
  ],
  exams: [
    "when are the exams", "when is the exam", "when is cie", "when is cie 2", "when is the theory exam", "exam dates", "when do exams start",
    "when is the lab test", "when are internals", "internal exam dates", "when are semester exams", "see exam", "when is practical exam",
    "when is the make up exam", "exam timetable", "when is test 2", "when are the cie tests", "end sem exam date", "when do finals start", "semester exam dates", "when is the end sem", "exam schedule", "when are tests", "when is internal assessment",
  ],
  projection: [
    "what will my attendance be at the end of the sem", "if i attend all classes what will my {S} be", "final attendance in {S}",
    "how many classes are left in {S}", "classes remaining in {S}", "by semester end what will i have", "how many classes left this sem",
    "if i attend everything what will my {S} attendance be", "projected attendance", "end of sem attendance in {S}",
    "how many can i miss for the rest of the sem in {S}", "how many {S} classes are remaining", "what will my final percentage be",
    "can i reach 75 in {S} by the end", "will i make it to 75 in {S}", "semester end percentage", "classes left in {S}", "remaining classes in {S}", "how many {S} classes left", "rest of the sem how many can i miss in {S}",
  ],
  open_section: [
    "open planner", "open calendar", "go to timetable", "open settings", "take me to dashboard", "open study planner", "show planner page",
    "go to settings", "navigate to calendar", "open timetable", "go home", "open home", "take me to the planner", "go to calendar page",
    "open sync settings", "go to attendance page", "open the settings", "go back home", "open dashboard", "show settings",
  ],
  open_classroom: [
    "open classroom for {S}", "open {S} classroom", "{S} google classroom", "take me to {S} classroom", "classroom link for {S}",
    "open google classroom {S}", "go to {S} classroom", "{S} classroom link", "open the classroom of {S}", "show {S} classroom", "take me to the {S} classroom", "{S} classroom page",
  ],
  help: [
    "help", "hi", "hello", "hey", "what can you do", "how do i use this", "what can i ask", "good morning", "thanks", "thank you",
    "ok", "hmm", "who are you", "what are you", "options", "menu", "start", "help me", "how does this work", "nice", "hello there", "hey there", "okay", "cool", "what can you help with", "help pls",
  ],
  out_of_scope: [
    "explain normalization in {S}", "what is a deadlock", "tell me a joke", "what is the weather today", "write my {S} assignment",
    "solve this question", "what is tcp", "explain {S}", "who won the match", "teach me {S}", "what is 2 plus 2", "give me notes for {S}",
    "what is the capital of india", "recommend a movie", "write a poem", "what is an automaton", "how to cook maggi",
    "translate this to kannada", "what is the meaning of life", "summarize chapter 3 of {S}", "important questions for {S}",
    "previous year papers {S}", "how to score good marks in {S}", "what is the weather", "weather tomorrow", "what is 5 times 6", "translate hello", "who is the prime minister", "play a song", "write code for {S}",
  ],
};

/** Deterministic PRNG so training is reproducible. */
export const rng = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
const pick = <X>(r: () => number, xs: X[]) => xs[Math.floor(r() * xs.length)];

/** Typo-style noise: drop, swap or double one letter in a word. */
const typo = (r: () => number, s: string) => {
  const words = s.split(" ");
  const i = Math.floor(r() * words.length), w = words[i];
  if (w.length < 4 || w.includes("{")) return s;
  const j = 1 + Math.floor(r() * (w.length - 2));
  const kind = r();
  words[i] = kind < 0.33 ? w.slice(0, j) + w.slice(j + 1) : kind < 0.66 ? w.slice(0, j) + w[j + 1] + w[j] + w.slice(j + 2) : w.slice(0, j) + w[j] + w.slice(j);
  return words.join(" ");
};

export type Example = { text: string; intent: ModelIntent };

/** Expand templates into examples. `perTemplate` fills each template that many times with random slots and noise. */
export const expand = (templates: Partial<Record<ModelIntent, T[]>>, perTemplate: number, seed: number): Example[] => {
  const r = rng(seed);
  const out: Example[] = [];
  for (const [intent, list] of Object.entries(templates) as [ModelIntent, T[]][])
    for (const t of list)
      for (let n = 0; n < perTemplate; n++) {
        let s = r() < 0.15 ? typo(r, t) : t;
        s = s.replace("{S}", pick(r, SUBJECTS)).replace("{D}", pick(r, DATES)).replace("{T}", pick(r, TIMES));
        s = pick(r, FILLER_START) + s + pick(r, FILLER_END);
        if (r() < 0.3) s = s.toLowerCase();
        out.push({ text: s, intent });
      }
  return out;
};

/** Split templates into train/test per intent (every 7th template held out), so the test measures new phrasings. */
export const splitTemplates = () => {
  const train: Partial<Record<ModelIntent, T[]>> = {}, test: Partial<Record<ModelIntent, T[]>> = {};
  for (const [intent, list] of Object.entries(TEMPLATES) as [ModelIntent, T[]][]) {
    train[intent] = list.filter((_, i) => i % 7 !== 3);
    test[intent] = list.filter((_, i) => i % 7 === 3);
  }
  return { train, test };
};
