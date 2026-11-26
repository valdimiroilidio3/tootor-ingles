import type { Cefr, PersonalityId } from "@/lib/types";

export interface ScenarioStep {
  /** Tutor line. "{tutor}" is replaced by the personality name. */
  tutor: string;
  tutorPt: string;
  suggestions: string[];
  /** Keywords (word prefixes or phrases): any match counts as an on-topic reply. */
  expect: string[];
  model: string;
  alternatives: string[];
  tipPt: string;
}

export interface Scenario {
  id: string;
  title: string;
  titlePt: string;
  emoji: string;
  level: Cefr;
  description: string;
  phrases: { en: string; pt: string }[];
  steps: ScenarioStep[];
  closing: { en: string; pt: string };
}

export interface Personality {
  id: PersonalityId;
  name: string;
  label: string;
  description: string;
  praise: string[];
  nudge: string;
}

export const PERSONALITIES: Personality[] = [
  { id: "friendly", name: "Lumo", label: "Friendly guide", description: "Warm, encouraging, celebrates small wins.", praise: ["Great job!", "Nice one!", "Well done!"], nudge: "Good try! Here's an idea:" },
  { id: "coach", name: "Coach Max", label: "Direct coach", description: "Short, precise and focused on accuracy.", praise: ["Good. Keep going.", "Correct structure.", "Solid answer."], nudge: "Let's tighten that up:" },
  { id: "casual", name: "Kai", label: "Relaxed friend", description: "Casual tone, like chatting with a friend.", praise: ["Cool!", "Nice, that works!", "Sweet!"], nudge: "Almost there, try this:" },
];

export function getPersonality(id: PersonalityId): Personality {
  return PERSONALITIES.find((p) => p.id === id) ?? PERSONALITIES[0];
}

const step = (
  tutor: string,
  tutorPt: string,
  suggestions: string[],
  expect: string[],
  model: string,
  alternatives: string[],
  tipPt: string,
): ScenarioStep => ({ tutor, tutorPt, suggestions, expect, model, alternatives, tipPt });

export const SCENARIOS: Scenario[] = [
  {
    id: "introducing-yourself",
    title: "Introducing yourself",
    titlePt: "Apresentando-se",
    emoji: "🙋",
    level: "A1",
    description: "Meet someone new and tell them about you.",
    phrases: [
      { en: "My name is Ana.", pt: "Meu nome é Ana." },
      { en: "Nice to meet you.", pt: "Prazer em conhecê-lo." },
      { en: "I'm from Brazil.", pt: "Eu sou do Brasil." },
      { en: "I'm twenty-five years old.", pt: "Eu tenho vinte e cinco anos." },
      { en: "I work as an engineer.", pt: "Eu trabalho como engenheiro(a)." },
      { en: "I like listening to music.", pt: "Eu gosto de ouvir música." },
    ],
    steps: [
      step("Hi! I'm {tutor}. What's your name?", "Oi! Eu sou {tutor}. Qual é o seu nome?", ["My name is Ana.", "I'm Ana. Nice to meet you."], ["name", "i'm", "i am", "call"], "My name is Ana. Nice to meet you.", ["I'm Ana. Nice to meet you.", "Hi, I'm Ana."], "Use “My name is…” ou “I'm…” para se apresentar."),
      step("Nice to meet you! Where are you from?", "Prazer! De onde você é?", ["I'm from Brazil.", "I am from São Paulo, Brazil."], ["from", "brazil", "live", "brazilian"], "I'm from Brazil.", ["I come from Brazil.", "I am Brazilian."], "Para dizer a origem: “I'm from + lugar”."),
      step("How old are you?", "Quantos anos você tem?", ["I'm 30 years old.", "I am twenty-five."], ["old", "years", "i am", "i'm"], "I'm 30 years old.", ["I am 30.", "I'm thirty."], "Em inglês a idade usa “to be”, não “have”."),
      step("What do you do?", "O que você faz (profissão)?", ["I'm a student.", "I work as an engineer."], ["student", "work", "teacher", "engineer", "i am a", "i'm a", "job"], "I work as an engineer.", ["I'm an engineer.", "I am a teacher."], "“I work as…” ou “I'm a…” para profissão."),
      step("Great! What do you like to do in your free time?", "Ótimo! O que você gosta de fazer no tempo livre?", ["I like playing football.", "I love listening to music."], ["like", "love", "enjoy", "play", "music", "read", "watch"], "I like listening to music.", ["I enjoy reading books.", "I love watching movies."], "“I like + verbo-ing” fala sobre gostos."),
    ],
    closing: { en: "Great job! You introduced yourself very well.", pt: "Ótimo trabalho! Você se apresentou muito bem." },
  },
  {
    id: "ordering-food",
    title: "Ordering food",
    titlePt: "Pedindo comida",
    emoji: "🍽️",
    level: "A1",
    description: "Order a meal at a restaurant and pay the bill.",
    phrases: [
      { en: "I would like a glass of water, please.", pt: "Eu gostaria de um copo de água, por favor." },
      { en: "Can I have the menu, please?", pt: "Posso ver o cardápio, por favor?" },
      { en: "I'll have the chicken salad.", pt: "Vou querer a salada de frango." },
      { en: "It is delicious.", pt: "Está delicioso." },
      { en: "The bill, please.", pt: "A conta, por favor." },
      { en: "Can I pay by card?", pt: "Posso pagar com cartão?" },
    ],
    steps: [
      step("Welcome to Blue Fork! What would you like to drink?", "Bem-vindo ao Blue Fork! O que você gostaria de beber?", ["Water, please.", "I would like a coffee, please."], ["water", "coffee", "juice", "tea", "drink", "please", "like", "soda"], "I would like a glass of water, please.", ["Can I have some water, please?", "Water, please."], "“I would like…” é educado para pedir."),
      step("Here is the menu. Are you ready to order?", "Aqui está o cardápio. Você está pronto para pedir?", ["Yes, I would like the chicken salad.", "Not yet, one minute please."], ["yes", "not yet", "minute", "like", "chicken", "pasta", "pizza", "salad", "have", "order", "want"], "Yes, I would like the chicken salad, please.", ["Can I have the chicken salad, please?", "I'll have the chicken salad."], "“I'll have…” também é muito natural em restaurantes."),
      step("Would you like anything else?", "Você gostaria de mais alguma coisa?", ["No, thank you.", "Yes, a dessert, please."], ["no", "yes", "thank", "dessert", "else", "that"], "No, that's all, thank you.", ["Yes, can I have a dessert?", "Just the bill, please."], "“That's all” = isso é tudo."),
      step("Is everything okay with your meal?", "Está tudo bem com a sua refeição?", ["Yes, it's delicious.", "It's very good, thank you."], ["good", "delicious", "great", "nice", "tasty", "fine", "okay", "yes", "perfect"], "Yes, it is delicious, thank you.", ["It's very good, thank you.", "Everything is great."], "Elogie com adjetivos: delicious, tasty, great."),
      step("Can I get you anything else, or would you like the bill?", "Mais alguma coisa, ou você gostaria da conta?", ["The bill, please.", "Can I pay by card?"], ["bill", "check", "pay", "card", "cash"], "The bill, please. Can I pay by card?", ["Can we have the check, please?", "Could I pay by card?"], "“The bill” (UK) e “the check” (US) são a conta."),
    ],
    closing: { en: "Perfect! Thank you for visiting. Have a nice day!", pt: "Perfeito! Obrigado pela visita. Tenha um bom dia!" },
  },
  {
    id: "shopping",
    title: "Shopping",
    titlePt: "Fazendo compras",
    emoji: "🛍️",
    level: "A1",
    description: "Find the right size, ask the price and pay.",
    phrases: [
      { en: "I'm looking for a jacket.", pt: "Estou procurando uma jaqueta." },
      { en: "Do you have this in medium?", pt: "Você tem isto no tamanho M?" },
      { en: "How much is it?", pt: "Quanto custa?" },
      { en: "It's too expensive.", pt: "É caro demais." },
      { en: "Can I try it on?", pt: "Posso experimentar?" },
      { en: "I'll take it.", pt: "Vou levar." },
    ],
    steps: [
      step("Hello! Can I help you?", "Olá! Posso ajudar?", ["Yes, I'm looking for a jacket.", "I'm just looking, thanks."], ["looking", "jacket", "shirt", "help", "need", "want", "just"], "Yes, I'm looking for a jacket.", ["I need a jacket, please.", "I'm just looking, thank you."], "“I'm looking for…” = estou procurando."),
      step("Sure! What size do you wear?", "Claro! Qual tamanho você usa?", ["I wear a medium.", "I think I'm a large."], ["small", "medium", "large", "size", "wear", "extra"], "I wear a medium.", ["I'm a size medium.", "Medium, please."], "Tamanhos: small (P), medium (M), large (G)."),
      step("Here you go. Do you like this color?", "Aqui está. Você gosta desta cor?", ["Yes, I like it.", "Do you have it in black?"], ["yes", "like", "love", "black", "blue", "color", "colour", "have", "no", "other"], "Yes, I like it. Do you have it in black?", ["I love it, thanks.", "Do you have another color?"], "“Do you have it in…?” pergunta por outra cor/tamanho."),
      step("This one is eighty dollars.", "Este custa oitenta dólares.", ["It's too expensive.", "Do you have a cheaper one?"], ["expensive", "cheap", "cheaper", "discount", "much", "price", "too", "less"], "It's a little expensive. Do you have a cheaper one?", ["Is there a discount?", "That's too much for me."], "“Cheaper” é o comparativo de cheap (mais barato)."),
      step("How would you like to pay?", "Como você gostaria de pagar?", ["By card, please.", "I'll pay in cash."], ["card", "cash", "pay", "credit", "debit"], "I'll pay by card, please.", ["Can I pay by card?", "Cash, please."], "“I'll pay by card/in cash.” são as formas usuais."),
    ],
    closing: { en: "Thank you for shopping with us. See you soon!", pt: "Obrigado por comprar conosco. Até logo!" },
  },
  {
    id: "asking-directions",
    title: "Asking for directions",
    titlePt: "Pedindo direções",
    emoji: "🗺️",
    level: "A1",
    description: "Find your way around a city.",
    phrases: [
      { en: "Excuse me, where is the train station?", pt: "Com licença, onde fica a estação de trem?" },
      { en: "Could you repeat that, please?", pt: "Você poderia repetir, por favor?" },
      { en: "Turn left at the bank.", pt: "Vire à esquerda no banco." },
      { en: "Is it far from here?", pt: "Fica longe daqui?" },
      { en: "It's about ten minutes on foot.", pt: "São cerca de dez minutos a pé." },
      { en: "Can you show me on the map?", pt: "Você pode me mostrar no mapa?" },
    ],
    steps: [
      step("Hello! You look lost. Can I help you?", "Olá! Você parece perdido. Posso ajudar?", ["Excuse me, where is the train station?", "Yes, please. How do I get to the museum?"], ["where", "how", "station", "museum", "get to", "bank", "find"], "Excuse me, where is the train station?", ["Could you tell me how to get to the station?", "How can I get to the station?"], "“Excuse me” chama a atenção com educação."),
      step("The station? Go straight for two blocks.", "A estação? Siga em frente por duas quadras.", ["Okay, two blocks. And then?", "Sorry, can you repeat that?"], ["then", "repeat", "sorry", "again", "slowly", "what", "next", "blocks"], "Okay, two blocks. And then?", ["Sorry, could you repeat that, please?", "Could you speak more slowly?"], "Para pedir repetição: “Could you repeat that?”"),
      step("Then turn left at the bank. The station is on your right.", "Depois vire à esquerda no banco. A estação fica à sua direita.", ["Is it far from here?", "How long does it take to walk there?"], ["far", "walk", "long", "minutes", "how"], "Is it far from here?", ["How long does it take to walk there?", "Can I walk there?"], "“Is it far?” = fica longe?"),
      step("No, it's about ten minutes on foot.", "Não, são cerca de dez minutos a pé.", ["Great, thank you!", "Perfect. Can you show me on the map?"], ["thank", "great", "perfect", "map", "show", "thanks", "ok"], "Great, thank you very much for your help!", ["Perfect, thanks a lot.", "Can you show me on the map?"], "Agradeça sempre: “Thank you very much.”"),
      step("You're welcome. Do you need anything else?", "De nada. Precisa de mais alguma coisa?", ["No, thanks. Have a nice day!", "Yes, where can I buy a ticket?"], ["no", "yes", "thank", "day", "ticket", "buy", "where"], "No, thank you. Have a nice day!", ["Yes, where can I buy a ticket?", "That's all, thanks."], "“Have a nice day!” é uma despedida simpática."),
    ],
    closing: { en: "Enjoy your trip! You asked for directions really well.", pt: "Aproveite a viagem! Você pediu direções muito bem." },
  },
  {
    id: "airport",
    title: "Travelling through an airport",
    titlePt: "Viajando pelo aeroporto",
    emoji: "✈️",
    level: "A2",
    description: "Check in, choose a seat and find your gate.",
    phrases: [
      { en: "Here is my passport.", pt: "Aqui está meu passaporte." },
      { en: "I have one suitcase to check in.", pt: "Tenho uma mala para despachar." },
      { en: "I would like a window seat.", pt: "Eu gostaria de um assento na janela." },
      { en: "Where is gate 12?", pt: "Onde fica o portão 12?" },
      { en: "Is the flight on time?", pt: "O voo está no horário?" },
      { en: "What time does boarding start?", pt: "A que horas começa o embarque?" },
    ],
    steps: [
      step("Good morning. Passport and ticket, please. Where are you traveling today?", "Bom dia. Passaporte e passagem, por favor. Para onde você está viajando hoje?", ["I'm traveling to London.", "Here is my passport. I'm going to New York."], ["travel", "going", "passport", "london", "new york", "flight", "to"], "Here is my passport. I'm traveling to London.", ["Here you are. I'm flying to London."], "“Here you are” = aqui está (ao entregar algo)."),
      step("Do you have any bags to check in?", "Você tem malas para despachar?", ["Yes, one suitcase.", "No, only a carry-on bag."], ["suitcase", "bag", "carry", "luggage", "yes", "no", "one", "two"], "Yes, I have one suitcase to check in.", ["No, I only have a carry-on bag."], "“Carry-on” é a bagagem de mão."),
      step("Would you like a window or an aisle seat?", "Você prefere assento na janela ou no corredor?", ["A window seat, please.", "I prefer an aisle seat."], ["window", "aisle", "seat", "prefer", "like"], "I would like a window seat, please.", ["A window seat, please.", "Could I have an aisle seat?"], "“I prefer…” expressa preferência."),
      step("Here is your boarding pass. Your flight leaves from gate 12 at 10:30.", "Aqui está seu cartão de embarque. Seu voo sai do portão 12 às 10h30.", ["Thank you. Where is gate 12?", "Is the flight on time?"], ["where", "gate", "time", "delayed", "flight", "thank"], "Thank you. Where is gate 12?", ["Excuse me, how do I get to gate 12?"], "Confirme informações importantes perguntando."),
      step("Go through security and follow the signs. Have a nice flight!", "Passe pela segurança e siga as placas. Tenha um bom voo!", ["Thank you very much!", "Thanks! See you."], ["thank", "thanks"], "Thank you very much!", ["Thanks a lot!"], "Agradecimento final simples e educado."),
    ],
    closing: { en: "Perfect — you're ready to fly!", pt: "Perfeito — você está pronto para voar!" },
  },
  {
    id: "colleagues",
    title: "Talking to colleagues",
    titlePt: "Conversando com colegas",
    emoji: "🧑‍💼",
    level: "A2",
    description: "Small talk and simple requests at work.",
    phrases: [
      { en: "I started this week.", pt: "Comecei esta semana." },
      { en: "Do you have time for a quick meeting?", pt: "Você tem tempo para uma reunião rápida?" },
      { en: "Could you send me the report?", pt: "Você poderia me enviar o relatório?" },
      { en: "No problem.", pt: "Sem problema." },
      { en: "I have a deadline today.", pt: "Tenho um prazo hoje." },
      { en: "Sounds good!", pt: "Parece ótimo!" },
    ],
    steps: [
      step("Hi! I'm {tutor} from the design team. You must be the new colleague.", "Oi! Eu sou {tutor}, da equipe de design. Você deve ser o novo colega.", ["Yes, I started this week. Nice to meet you!", "Hi, nice to meet you. I'm new here."], ["new", "nice", "meet", "started", "yes", "hi", "hello"], "Yes, I started this week. Nice to meet you!", ["Hi, nice to meet you. I'm new here."], "“I started this week” usa o passado simples para algo já iniciado."),
      step("Welcome! How are you finding the job so far?", "Bem-vindo! Como está achando o trabalho até agora?", ["It's great, but I'm still learning.", "Everyone is very friendly."], ["great", "good", "friendly", "learning", "busy", "nice", "interesting", "fine", "enjoy"], "It's great so far, but I'm still learning the systems.", ["Everyone is very friendly."], "“So far” = até agora."),
      step("Do you have time for a quick meeting this afternoon?", "Você tem tempo para uma reunião rápida esta tarde?", ["Sure, what time?", "Sorry, I'm busy. Can we do tomorrow?"], ["sure", "time", "busy", "tomorrow", "yes", "sorry", "can", "okay", "meeting"], "Sure, what time works for you?", ["Yes, I'm free after three.", "Sorry, I'm busy. Could we do it tomorrow?"], "“What time works for you?” é natural no trabalho."),
      step("Could you send me the project report by Friday?", "Você poderia me enviar o relatório do projeto até sexta?", ["Of course, I'll send it on Thursday.", "Sure, no problem."], ["sure", "course", "problem", "send", "friday", "thursday", "will", "i'll", "report"], "Of course, I will send it by Thursday.", ["Sure, no problem."], "“By Friday” = até sexta."),
      step("Thanks! Do you want to grab lunch later?", "Obrigado! Quer almoçar mais tarde?", ["Sounds good! Where?", "I'd love to, but I have a deadline."], ["sounds", "good", "love", "where", "lunch", "sorry", "deadline", "sure", "yes", "busy"], "Sounds good! Where do you want to go?", ["I'd love to, but I have a deadline."], "“Sounds good” aceita um convite informalmente."),
    ],
    closing: { en: "Nice chat! You'll do great on the team.", pt: "Boa conversa! Você vai se dar bem na equipe." },
  },
  {
    id: "job-interview",
    title: "Job interview",
    titlePt: "Entrevista de emprego",
    emoji: "🎯",
    level: "B1",
    description: "Answer common interview questions with confidence.",
    phrases: [
      { en: "Thank you for having me.", pt: "Obrigado por me receber." },
      { en: "I have three years of experience in marketing.", pt: "Tenho três anos de experiência em marketing." },
      { en: "My greatest strength is communication.", pt: "Meu maior ponto forte é a comunicação." },
      { en: "I work well in a team.", pt: "Trabalho bem em equipe." },
      { en: "I'm excited about this opportunity.", pt: "Estou animado com esta oportunidade." },
      { en: "What are the next steps?", pt: "Quais são os próximos passos?" },
    ],
    steps: [
      step("Welcome, and thank you for coming. Please tell me a little about yourself.", "Bem-vindo, e obrigado por vir. Fale um pouco sobre você.", ["I am a marketing assistant with three years of experience.", "Thank you for having me. I have a degree in business."], ["experience", "degree", "work", "years", "student", "assistant", "manager", "thank", "i am", "i'm", "background"], "Thank you for having me. I have three years of experience in marketing.", ["I have a degree in business and two years of experience."], "Resuma sua profissão e experiência em 1–2 frases."),
      step("Why do you want to work for our company?", "Por que você quer trabalhar na nossa empresa?", ["I admire your products and I want to grow here.", "I believe my skills match this position."], ["because", "admire", "grow", "skills", "opportunity", "company", "learn", "believe", "passion", "interested", "want"], "I admire your company and I believe my skills match this position.", ["I want to grow and learn in a strong team."], "Mostre interesse na empresa e relacione com suas habilidades."),
      step("What would you say is your greatest strength?", "Qual você diria que é o seu maior ponto forte?", ["I am organized and I communicate well.", "My greatest strength is teamwork."], ["strength", "organized", "communicat", "teamwork", "patient", "creative", "skill", "good at", "hard"], "My greatest strength is communication. I work well in a team.", ["I am very organized and reliable."], "“My greatest strength is…” + exemplo curto."),
      step("Can you describe a challenge you faced at work and how you solved it?", "Você pode descrever um desafio no trabalho e como o resolveu?", ["We had a tight deadline, so I organized the tasks.", "Once, I had a problem with a client. I listened and found a solution."], ["deadline", "problem", "challenge", "solved", "solution", "client", "team", "difficult", "fixed", "organized", "learned", "when", "once"], "Once, we had a tight deadline, so I organized the tasks and we finished on time.", ["I had a problem with a client, so I listened and found a solution."], "Use o passado simples para contar a história."),
      step("Do you have any questions for us?", "Você tem alguma pergunta para nós?", ["Yes, what does a typical day look like?", "What are the next steps in the process?"], ["what", "how", "when", "question", "typical", "next steps", "team", "training"], "Yes, what are the next steps in the hiring process?", ["What does a typical day look like?"], "Sempre faça uma pergunta: mostra interesse."),
    ],
    closing: { en: "Thank you — it was a pleasure talking with you. We'll be in touch soon.", pt: "Obrigado — foi um prazer conversar com você. Entraremos em contato em breve." },
  },
  {
    id: "everyday-conversations",
    title: "Everyday conversations",
    titlePt: "Conversas do dia a dia",
    emoji: "☕",
    level: "A2",
    description: "Casual small talk about your day, the weather and plans.",
    phrases: [
      { en: "It's going well, thanks.", pt: "Está indo bem, obrigado." },
      { en: "I woke up early today.", pt: "Acordei cedo hoje." },
      { en: "It's sunny and warm.", pt: "Está ensolarado e quente." },
      { en: "I'm going to visit my family.", pt: "Vou visitar minha família." },
      { en: "What about you?", pt: "E você?" },
      { en: "Nice talking to you!", pt: "Foi bom conversar com você!" },
    ],
    steps: [
      step("Hey! How's your day going?", "Oi! Como está o seu dia?", ["It's going well, thanks. And you?", "Pretty busy, but good."], ["good", "well", "fine", "busy", "great", "tired", "okay", "bad", "and you"], "It's going well, thanks. How about you?", ["Pretty busy, but good."], "“How about you?” devolve a pergunta."),
      step("I'm good, thanks! What did you do this morning?", "Estou bem, obrigado! O que você fez esta manhã?", ["I woke up early and had coffee.", "I went to the gym."], ["woke", "went", "had", "did", "work", "study", "ate", "coffee", "gym", "breakfast", "morning", "read", "watched"], "I woke up early and had breakfast.", ["I went to the gym."], "Ações passadas usam verbos no passado: woke, went, had."),
      step("Nice! What's the weather like where you are?", "Legal! Como está o clima onde você está?", ["It's sunny and warm.", "It's cold and rainy today."], ["sunny", "rain", "cold", "hot", "warm", "cloud", "weather", "windy", "nice", "snow"], "It's sunny and warm today.", ["It's cold and rainy today."], "Para clima usamos “It's + adjetivo”."),
      step("Lovely. Do you have any plans for the weekend?", "Que bom. Você tem planos para o fim de semana?", ["I'm going to visit my family.", "Maybe I will watch a movie."], ["going", "plan", "visit", "watch", "maybe", "will", "nothing", "stay", "relax", "weekend", "family", "friends"], "I'm going to visit my family. What about you?", ["Maybe I will watch a movie."], "“I'm going to + verbo” para planos."),
      step("That sounds great! I need to go now, but it was nice talking to you.", "Parece ótimo! Preciso ir agora, mas foi bom conversar com você.", ["Nice talking to you too! See you soon.", "Bye! Have a great day."], ["bye", "see", "soon", "talk", "nice", "day", "later", "goodbye", "you too"], "Nice talking to you too! See you soon.", ["Bye! Have a great day."], "“You too” devolve o desejo."),
    ],
    closing: { en: "Great conversation! Your English sounds more natural every time.", pt: "Ótima conversa! Seu inglês fica mais natural a cada vez." },
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
