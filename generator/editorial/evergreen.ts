import { createHash } from "node:crypto";
import { XMLParser } from "fast-xml-parser";
import { hasArticleAdapter, sourceArticleSections } from "./articleText";
import { failureReason, plainText, readBounded, type SourcePacket } from "./sources";
import { coverageUrl, coveredUrlKeys } from "./coverage";

// Deliberate reading shelf: factual background and criticism, never current news.
// Add URLs here as the shelf is reviewed; covered URLs are filtered by generate.ts.
export const EVERGREEN_SOURCES = [
  // Bounded movie/Sopranos review: docs/movie-sopranos-source-review-20260919.md.
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Wide Wide West: The Hateful Eight", "url": "https://theasc.com/article/wide-wide-west-the-hateful-eight/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Finessing Killers of the Flower Moon at Company 3", "url": "https://theasc.com/article/finessing-killers-of-the-flower-moon-at-company-3/"},
  {"topic": "movies", "publisher": "BFI", "title": "“I realised any attempt to replicate is going to be a failure”: Sophy Romvari on Blue Heron", "url": "https://www.bfi.org.uk/sight-and-sound/interviews/i-realised-any-attempt-replicate-going-be-failure-sophy-romvari-blue-heron"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "Edie Falco: ‘Alcohol was the answer to all my problems – and the cause of them’", "url": "https://www.theguardian.com/tv-and-radio/2021/dec/01/edie-falco-interview-tv-actor-alcohol-hillary-clinton-sopranos"},
  // September 19 packet review: complete narrow payoffs; see docs/culture-source-review-20260919.md.
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "The Symposium in Ancient Greece", "url": "https://www.metmuseum.org/essays/the-symposium-in-ancient-greece", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Personal Identity", "url": "https://plato.stanford.edu/entries/identity-personal/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "The Free Rider Problem", "url": "https://plato.stanford.edu/entries/free-rider/"},
  {"topic": "science", "publisher": "NASA", "title": "Ceres Facts", "url": "https://science.nasa.gov/dwarf-planets/ceres/facts/"},
  // WP2 source pilot: reviewed extraction AND numbered evidence; see docs/editorial-depth.md.
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Theater in Ancient Greece", "url": "https://www.metmuseum.org/essays/theater-in-ancient-greece", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Death, Burial, and the Afterlife in Ancient Greece", "url": "https://www.metmuseum.org/essays/death-burial-and-the-afterlife-in-ancient-greece", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Mystery Cults in the Greek and Roman World", "url": "https://www.metmuseum.org/essays/mystery-cults-in-the-greek-and-roman-world", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},
  {"topic": "movies", "publisher": "Stanford Encyclopedia of Philosophy", "title": "The Paradox of Suspense", "url": "https://plato.stanford.edu/entries/paradox-suspense/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Philosophy of Humor", "url": "https://plato.stanford.edu/entries/humor/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Fiction", "url": "https://plato.stanford.edu/entries/fiction/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Public Goods", "url": "https://plato.stanford.edu/entries/public-goods/"},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Roman Sarcophagi", "url": "https://www.metmuseum.org/essays/roman-sarcophagi", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},
  {"topic": "greek_roman_mythology", "publisher": "The Metropolitan Museum of Art", "title": "Roman Copies of Greek Statues", "url": "https://www.metmuseum.org/essays/roman-copies-of-greek-statues", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},

  // Retrieved and checked for usable article prose for the twenty-post rollout.
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Existentialism", "url": "https://plato.stanford.edu/entries/existentialism/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Distributive Justice", "url": "https://plato.stanford.edu/entries/justice-distributive/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Seneca", "url": "https://plato.stanford.edu/entries/seneca/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Epictetus", "url": "https://plato.stanford.edu/entries/epictetus/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Decision Theory", "url": "https://plato.stanford.edu/entries/decision-theory/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Markets", "url": "https://plato.stanford.edu/entries/markets/"},
  {"topic": "movies", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Philosophy of Film", "url": "https://plato.stanford.edu/entries/film/"},

  // Additional publisher pages checked during the September 17 planning implementation.
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Epicurus", "url": "https://plato.stanford.edu/entries/epicurus/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Niccolò Machiavelli", "url": "https://plato.stanford.edu/entries/machiavelli/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Aristotle’s Ethics", "url": "https://plato.stanford.edu/entries/aristotle-ethics/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Plato", "url": "https://plato.stanford.edu/entries/plato/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Game Theory", "url": "https://plato.stanford.edu/entries/game-theory/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Prisoner’s Dilemma", "url": "https://plato.stanford.edu/entries/prisoner-dilemma/"},
  {"topic": "greek_roman_mythology", "publisher": "World History Encyclopedia", "title": "Prometheus", "url": "https://www.worldhistory.org/Prometheus/"},
  {"topic": "greek_roman_mythology", "publisher": "World History Encyclopedia", "title": "Medusa", "url": "https://www.worldhistory.org/Medusa/"},
  {"topic": "philosophy", "publisher": "World History Encyclopedia", "title": "Marcus Aurelius", "url": "https://www.worldhistory.org/Marcus_Aurelius/", "retired": "2026-10-22: pages now embed SVG DOCTYPE declarations, which the extractor's DTD guard correctly rejects."},

  { topic: "the_sopranos", publisher: "BFI", title: "TV's a crowd", url: "https://www.bfi.org.uk/sight-and-sound/features/tvs-crowd" },
  { topic: "the_sopranos", publisher: "BFI", title: "The Many Saints of Newark and the baggage of The Sopranos", url: "https://www.bfi.org.uk/sight-and-sound/reviews/many-saints-newark-cant-escape-baggage-sopranos" },
  { topic: "movies", publisher: "BFI", title: "10 great films about television", url: "https://www.bfi.org.uk/lists/10-great-films-about-television" },
  { topic: "greek_roman_mythology", publisher: "World History Encyclopedia", title: "Greek Mythology", url: "https://www.worldhistory.org/Greek_Mythology/" },
  { topic: "greek_roman_mythology", publisher: "World History Encyclopedia", title: "Roman Mythology", url: "https://www.worldhistory.org/Roman_Mythology/" },
  { topic: "greek_roman_mythology", publisher: "World History Encyclopedia", title: "Mythology", url: "https://www.worldhistory.org/mythology/" },
  { topic: "philosophy", publisher: "Stanford Encyclopedia of Philosophy", title: "Stoicism", url: "https://plato.stanford.edu/entries/stoicism/" },
  { topic: "philosophy", publisher: "Stanford Encyclopedia of Philosophy", title: "Marcus Aurelius", url: "https://plato.stanford.edu/entries/marcus-aurelius/" },
  { topic: "economics", publisher: "Stanford Encyclopedia of Philosophy", title: "Philosophy of Economics", url: "https://plato.stanford.edu/entries/economics/" },
  // Retrieved September 18: usable prose confirmed with articleExcerpt; background only.
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Free Will","url":"https://plato.stanford.edu/entries/freewill/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Friedrich Nietzsche","url":"https://plato.stanford.edu/entries/nietzsche/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Albert Camus","url":"https://plato.stanford.edu/entries/camus/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"David Hume","url":"https://plato.stanford.edu/entries/hume/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Skepticism","url":"https://plato.stanford.edu/entries/skepticism/"},
  {"topic":"philosophy","publisher":"Stanford Encyclopedia of Philosophy","title":"Well-Being","url":"https://plato.stanford.edu/entries/well-being/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Socrates","url":"https://iep.utm.edu/socrates/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Aristotle: Ethics","url":"https://iep.utm.edu/aristotle-ethics/"},
  {"topic":"science","publisher":"NASA","title":"Black Holes","url":"https://science.nasa.gov/universe/black-holes/"},
  {"topic":"science","publisher":"NASA","title":"Asteroids","url":"https://science.nasa.gov/solar-system/asteroids/"},
  {"topic":"science","publisher":"NASA","title":"Comets","url":"https://science.nasa.gov/solar-system/comets/"},
  {"topic":"science","publisher":"NASA","title":"Exoplanets","url":"https://science.nasa.gov/exoplanets/"},
  {"topic":"greek_roman_mythology","publisher":"The Metropolitan Museum of Art","title":"Greek Gods and Religious Practices","url":"https://www.metmuseum.org/essays/greek-gods-and-religious-practices", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},
  {"topic":"greek_roman_mythology","publisher":"The Metropolitan Museum of Art","title":"Greek Art in the Archaic Period","url":"https://www.metmuseum.org/essays/greek-art-in-the-archaic-period", "retired": "2026-10-22: metmuseum.org serves a Vercel bot checkpoint (HTTP 429) to automated requests; never bypass it."},
  {"topic":"science","publisher":"NASA","title":"Dark Matter","url":"https://science.nasa.gov/dark-matter/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Aesthetics","url":"https://iep.utm.edu/aesthetics/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Solipsism and the Problem of Other Minds","url":"https://iep.utm.edu/solipsis/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Hedonism","url":"https://iep.utm.edu/hedonism/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Paradox of Hedonism","url":"https://iep.utm.edu/paradox-of-hedonism/"},
  {"topic":"philosophy","publisher":"Internet Encyclopedia of Philosophy","title":"Time","url":"https://iep.utm.edu/time/"},
  {"topic":"movies","publisher":"Internet Encyclopedia of Philosophy","title":"Philosophy of Film: Continental Perspectives","url":"https://iep.utm.edu/filmcont/"},
  {"topic":"economics","publisher":"Stanford Encyclopedia of Philosophy","title":"Social Choice Theory","url":"https://plato.stanford.edu/entries/social-choice/"},
  {"topic":"economics","publisher":"Stanford Encyclopedia of Philosophy","title":"Normative Theories of Rational Choice: Expected Utility","url":"https://plato.stanford.edu/entries/rationality-normative-utility/"},
  {"topic":"economics","publisher":"Stanford Encyclopedia of Philosophy","title":"Bounded Rationality","url":"https://plato.stanford.edu/entries/bounded-rationality/"},
  {"topic":"science","publisher":"NASA","title":"Titan","url":"https://science.nasa.gov/saturn/moons/titan/"},
  // October 22 supply review: 33 reviewed pages for mythology, Sopranos and philosophy.
  // Guardian/JSTOR Daily/Aeon pages use their inspected adapters; see docs/source-supply-review-20261022.md.
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Healing and Memory in Ancient Greece", "url": "https://daily.jstor.org/healing-and-memory-in-ancient-greece/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "The Unusual, Unexpected Erechtheion", "url": "https://daily.jstor.org/the-unusual-unexpected-erechtheion/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Smoke Gets in Your Eyes: Animal Sacrifice and the Greek Gods", "url": "https://daily.jstor.org/smoke-gets-in-your-eyes-animal-sacrifice-and-the-greek-gods/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Venus of the Sewers", "url": "https://daily.jstor.org/venus-of-the-sewers/"},
  {"topic": "greek_roman_mythology", "publisher": "Aeon", "title": "Replicants and robots: what can the ancient Greeks teach us?", "url": "https://aeon.co/essays/replicants-and-robots-what-can-the-ancient-greeks-teach-us"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "How Do We Know That Epic Poems Were Recited from Memory?", "url": "https://daily.jstor.org/how-do-we-know-that-epic-poems-were-recited-from-memory/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Super Mario, Homer’s Odyssey, and the Meaning of Marriage", "url": "https://daily.jstor.org/super-mario-homers-odyssey-and-the-meaning-of-marriage/"},
  {"topic": "greek_roman_mythology", "publisher": "Aeon", "title": "How a vanished ancient Greek city helps us think about disasters", "url": "https://aeon.co/essays/how-a-vanished-ancient-greek-city-helps-us-think-about-disasters"},
  {"topic": "greek_roman_mythology", "publisher": "Aeon", "title": "The ancient world teemed with birds; now we think with them", "url": "https://aeon.co/essays/the-ancient-world-teemed-with-birds-now-we-think-with-them"},
  {"topic": "greek_roman_mythology", "publisher": "Aeon", "title": "When Homer envisioned Achilles, did he see a black man?", "url": "https://aeon.co/essays/when-homer-envisioned-achilles-did-he-see-a-black-man"},
  {"topic": "greek_roman_mythology", "publisher": "Aeon", "title": "Why it pays to read for acrostics in the Classics", "url": "https://aeon.co/essays/why-it-pays-to-read-for-acrostics-in-the-classics"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos: 10 years since it finished, it's still the most masterful show ever", "url": "https://www.theguardian.com/tv-and-radio/2017/jun/08/the-sopranos-10-years-since-it-finished-its-still-the-most-masterful-show-ever"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos at 20: how the hit show changed the gangster genre", "url": "https://www.theguardian.com/tv-and-radio/2019/jan/14/the-sopranos-at-20-how-the-hit-show-changed-the-gangster-genre"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos, glorious pioneer of today’s TV golden age", "url": "https://www.theguardian.com/commentisfree/2019/jan/13/the-sopranos-glorious-pioneer-of-todays-tv-golden-age"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "David Chase on why he wrote The Sopranos: 'I needed help. I needed therapy'", "url": "https://www.theguardian.com/tv-and-radio/2019/sep/16/david-chase-the-sopranos-best-tv-21st-century"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos: from enduring TV hit to the hottest show of lockdown", "url": "https://www.theguardian.com/tv-and-radio/2020/dec/19/sopranos-hit-social-media-generation-mafia-series-emotional-struggles"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos: David Chase and Vincent Curatola on how they made a TV classic", "url": "https://www.theguardian.com/tv-and-radio/2021/mar/08/sopranos-david-chase-mobster-johnny-sack-how-they-made-tv-classic-fox-mob-murders"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "David Chase: I was annoyed that fans wanted Tony Soprano dead", "url": "https://www.theguardian.com/tv-and-radio/2021/nov/03/david-chase-i-was-annoyed-that-fans-wanted-tony-soprano-dead"},
  {"topic": "the_sopranos", "publisher": "The Ringer", "title": "Half a Wiseguy: The Genius and the Menace of Paulie Walnuts", "url": "https://www.theringer.com/2022/07/10/tv/sopranos-tony-sirico-obituary-paulie-walnuts-gualtieri"},
  {"topic": "the_sopranos", "publisher": "The Ringer", "title": "Two Assholes Lost in the Woods: An Oral History of ‘Pine Barrens’", "url": "https://www.theringer.com/2021/05/05/tv/sopranos-pine-barrens-oral-history"},
  {"topic": "the_sopranos", "publisher": "The Ringer", "title": "How ‘Goodfellas’ Serves As the Bridge Between ‘The Godfather’ and ‘The Sopranos’", "url": "https://www.theringer.com/2020/09/17/movies/goodfellas-martin-scorsese-the-godfather-the-sopranos"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Socrates", "url": "https://plato.stanford.edu/entries/socrates/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Ancient Theories of Soul", "url": "https://plato.stanford.edu/entries/ancient-soul/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Presocratic Philosophy", "url": "https://plato.stanford.edu/entries/presocratics/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Pythagoras", "url": "https://plato.stanford.edu/entries/pythagoras/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Kant’s Moral Philosophy", "url": "https://plato.stanford.edu/entries/kant-moral/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Simone de Beauvoir", "url": "https://plato.stanford.edu/entries/beauvoir/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Confucius", "url": "https://plato.stanford.edu/entries/confucius/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Moral Luck", "url": "https://plato.stanford.edu/entries/moral-luck/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Happiness", "url": "https://plato.stanford.edu/entries/happiness/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Heraclitus", "url": "https://plato.stanford.edu/entries/heraclitus/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Democritus", "url": "https://plato.stanford.edu/entries/democritus/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Aristotle", "url": "https://plato.stanford.edu/entries/aristotle/"},
  // October 23 refill: 72 reviewed pages for mythology, film, Sopranos, science and
  // economics; see docs/source-supply-review-20261023.md. Shelf use is paced per edition.
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "\"Thoughts and Prayers\" in Greek Tragedy", "url": "https://daily.jstor.org/thoughts-and-prayers-in-greek-tragedy/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Poisoning like the Romans", "url": "https://daily.jstor.org/poisoning-like-the-romans/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Everyone in Pompeii Got Takeout, Too", "url": "https://daily.jstor.org/everyone-in-pompeii-got-takeout-too/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Political Corruption in Athens and Rome", "url": "https://daily.jstor.org/political-corruption-in-athens-and-rome/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Why Some Spartan Women Had Two Husbands", "url": "https://daily.jstor.org/why-some-spartan-women-had-two-husbands/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Fish Addiction: An Ancient Greek Paranoia", "url": "https://daily.jstor.org/fish-addiction-an-ancient-greek-paranoia/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Ancient Rome: A City of Immigrants", "url": "https://daily.jstor.org/ancient-rome-a-city-of-immigrants/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "A Roman Feast… of Death!", "url": "https://daily.jstor.org/a-roman-feast-of-death/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "Slave Collars in Ancient Rome", "url": "https://daily.jstor.org/slave-collars-in-ancient-rome/"},
  {"topic": "greek_roman_mythology", "publisher": "JSTOR Daily", "title": "The Greek Tragedy Behind Suddenly Last Summer", "url": "https://daily.jstor.org/the-greek-tragedy-behind-suddenly-last-summer/"},
  {"topic": "greek_roman_mythology", "publisher": "Aeon", "title": "How did the Roman Empire view nature and its seasons?", "url": "https://aeon.co/essays/how-did-the-roman-empire-view-nature-and-its-seasons"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Beyond The Frame: The Exorcist", "url": "https://theasc.com/article/beyond-the-frame-the-exorcist-1973/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Beyond The Frame: Blade Runner", "url": "https://theasc.com/article/beyond-the-frame-blade-runner-1982/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Beyond The Frame: 2001: A Space Odyssey", "url": "https://theasc.com/article/beyond-the-frame-2001-a-space-odyssey-1968/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "'Seven': Darius Khondji, ASC, AFC's Pioneering Cinematography", "url": "https://theasc.com/article/seven-cinematography-khondji-fincher/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Behind the Scenes of 'The Deer Hunter'", "url": "https://theasc.com/article/the-deer-hunter-cinematography-zsigmond/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Photographing Stanley Kubrick’s The Shining", "url": "https://theasc.com/article/flashback-the-shining/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Wrap Shot: The Godfather", "url": "https://theasc.com/article/wrap-shot-the-godfather/"},
  {"topic": "movies", "publisher": "American Cinematographer", "title": "Beyond The Frame: The Wizard of Oz", "url": "https://theasc.com/article/beyond-the-frame-wizard-of-oz/"},
  {"topic": "movies", "publisher": "Aeon", "title": "Why does every film and TV series seem to have the same plot?", "url": "https://aeon.co/essays/why-does-every-film-and-tv-series-seem-to-have-the-same-plot"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Was Charlie Chaplin's Tramp Un-American?", "url": "https://daily.jstor.org/charlie-chaplins-tramp-un-american/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Weirdly Enough, Movies about TV Prepared America for TV", "url": "https://daily.jstor.org/weirdly-enough-movies-about-tv-prepared-america-for-tv/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Why Do Rainer Werner Fassbinder's Films Still Resonate?", "url": "https://daily.jstor.org/why-do-rainer-werner-fassbinders-films-still-resonate/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "How Rotten Tomatoes Changed the Film Industry", "url": "https://daily.jstor.org/how-rotten-tomatoes-changed-the-film-industry/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "The Last Silent Film Star", "url": "https://daily.jstor.org/the-last-silent-film-star/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "How Hollywood Thrived Through the Red Scare", "url": "https://daily.jstor.org/how-hollywood-thrived-through-the-red-scare/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "William Faulkner Goes to Hollywood", "url": "https://daily.jstor.org/william-faulkner-goes-to-hollywood/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Jerry Lewis: French Film Master", "url": "https://daily.jstor.org/jerry-lewis-french-film-master/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Is Don Quixote to Blame for Modern Movie Reboots?", "url": "https://daily.jstor.org/is-don-quixote-to-blame-for-modern-movie-reboots/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Why Drive-Ins Were More Than Movie Theaters", "url": "https://daily.jstor.org/why-drive-ins-were-more-than-movie-theaters/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "The Cold War Origins of Interactive Cinema", "url": "https://daily.jstor.org/the-cold-war-origins-of-interactive-cinema/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "The 1925 Dinosaur Movie That Paved the Way for King Kong", "url": "https://daily.jstor.org/the-1925-dinosaur-movie-that-paved-the-way-for-king-kong/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Hollywood Froze Out the Founding Mother of Cinema", "url": "https://daily.jstor.org/hollywood-froze-out-the-founding-mother-of-cinema/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "The Magic Lantern Shows that Influenced Modern Horror", "url": "https://daily.jstor.org/the-magic-lantern-shows-that-influenced-modern-horror/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "The First Movie Kiss", "url": "https://daily.jstor.org/the-first-movie-kiss/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "How Film Noir Tried to Scare Women out of Working", "url": "https://daily.jstor.org/how-film-noir-tried-to-scare-women-out-of-working/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Hitchcock’s Transition from London to Hollywood", "url": "https://daily.jstor.org/hitchcocks-transition-from-london-to-hollywood/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "Lon Chaney’s Movie Monsters", "url": "https://daily.jstor.org/lon-chaneys-movie-monsters/"},
  {"topic": "movies", "publisher": "JSTOR Daily", "title": "The Bizarre Marvels of Segundo de Chomón, Father of Spanish Cinema", "url": "https://daily.jstor.org/the-bizarre-marvels-of-segundo-de-chomon-father-of-spanish-cinema/"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "James Gandolfini's film career: much more than just another wiseguy", "url": "https://www.theguardian.com/culture/2013/jun/20/james-gandolfini-film-career-wiseguy"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "Goodbye, James Gandolfini", "url": "https://www.theguardian.com/commentisfree/2013/jun/20/james-gandolfini-death-sopranos"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos finale: David Chase doesn't owe us an explanation", "url": "https://www.theguardian.com/tv-and-radio/2015/apr/15/sopranos-finale-david-chase-explanation"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos | Your next box set", "url": "https://www.theguardian.com/tv-and-radio/2009/oct/09/box-set-the-sopranos"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "Why The Sopranos is the best TV drama of all time", "url": "https://www.theguardian.com/tv-and-radio/2010/jan/12/sopranos-best-tv-drama"},
  {"topic": "the_sopranos", "publisher": "The Guardian", "title": "The Sopranos begets the cult of Don't Stop Believin'", "url": "https://www.theguardian.com/music/2011/jun/12/sopranos-dont-stop-believin-journey"},
  {"topic": "science", "publisher": "Aeon", "title": "Why has Venus obsessed so many astronomers?", "url": "https://aeon.co/essays/why-has-venus-obsessed-so-many-astronomers"},
  {"topic": "science", "publisher": "Aeon", "title": "How the scientists of the 1960s turned the Moon into a place", "url": "https://aeon.co/essays/how-the-scientists-of-the-1960s-turned-the-moon-into-a-place"},
  {"topic": "science", "publisher": "Aeon", "title": "How UFOs almost killed the search for life in the Universe", "url": "https://aeon.co/essays/how-ufos-almost-killed-the-search-for-life-in-the-universe"},
  {"topic": "science", "publisher": "NASA", "title": "Saturn: Facts", "url": "https://science.nasa.gov/saturn/facts/"},
  {"topic": "science", "publisher": "NASA", "title": "Mercury: Facts", "url": "https://science.nasa.gov/mercury/facts/"},
  {"topic": "science", "publisher": "NASA", "title": "Uranus: Facts", "url": "https://science.nasa.gov/uranus/facts/"},
  {"topic": "science", "publisher": "NASA", "title": "Sun: Facts", "url": "https://science.nasa.gov/sun/facts/"},
  {"topic": "science", "publisher": "NASA", "title": "Pluto: Facts", "url": "https://science.nasa.gov/dwarf-planets/pluto/facts/"},
  {"topic": "science", "publisher": "JSTOR Daily", "title": "The Anatomists of Ancient Alexandria", "url": "https://daily.jstor.org/the-anatomists-of-ancient-alexandria/"},
  {"topic": "science", "publisher": "JSTOR Daily", "title": "Archimedes Rediscovered: Technology and Ancient History", "url": "https://daily.jstor.org/archimedes-rediscovered-technology-and-ancient-history/"},
  {"topic": "economics", "publisher": "Aeon", "title": "How did Kerala go from poor to prosperous among India’s states?", "url": "https://aeon.co/essays/how-did-kerala-go-from-poor-to-prosperous-among-indias-states"},
  {"topic": "economics", "publisher": "Aeon", "title": "Why Hume is better at explaining modern capitalism than Marx", "url": "https://aeon.co/essays/why-hume-is-better-at-explaining-modern-capitalism-than-marx"},
  {"topic": "economics", "publisher": "Aeon", "title": "The underground bankers who reshape the flow of global money", "url": "https://aeon.co/essays/the-underground-bankers-who-reshape-the-flow-of-global-money"},
  {"topic": "economics", "publisher": "Aeon", "title": "How do we deal with the catastrophe of uninsurability?", "url": "https://aeon.co/essays/how-do-we-deal-with-the-catastrophe-of-uninsurability"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "A Brief History of the Income Tax", "url": "https://daily.jstor.org/a-brief-history-of-the-income-tax/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "The Origins of Secret Swiss Bank Accounts", "url": "https://daily.jstor.org/origins-secret-swiss-bank-accounts/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "Wampum was Massachusetts' First Legal Currency", "url": "https://daily.jstor.org/wampum-was-massachusetts-first-legal-currency/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "Madeira, The Island That Helped Invent Capitalism", "url": "https://daily.jstor.org/madeira-the-island-that-helped-invent-capitalism/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "Why Do We Have “Free Trade” For Televisions, But Not For Corn?", "url": "https://daily.jstor.org/why-do-we-have-free-trade-for-tvs-but-not-for-corn/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "A Nation Built on Debt", "url": "https://daily.jstor.org/a-nation-built-on-debt/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "The Lemon Gang: Citrus and the Rise of the Mafia", "url": "https://daily.jstor.org/the-lemon-gang-citrus-and-the-rise-of-the-mafia/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "Putting a Price on a Life", "url": "https://daily.jstor.org/putting-a-price-on-a-life/"},
  {"topic": "economics", "publisher": "JSTOR Daily", "title": "Economics in Ancient Greece", "url": "https://daily.jstor.org/economics-in-ancient-greece/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Adam Smith’s Moral and Political Philosophy", "url": "https://plato.stanford.edu/entries/smith-moral-political/"},
  {"topic": "economics", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Bernard Mandeville", "url": "https://plato.stanford.edu/entries/mandeville/"},
  {"topic": "economics", "publisher": "Internet Encyclopedia of Philosophy", "title": "Adam Smith", "url": "https://iep.utm.edu/smith/"},
  {"topic": "philosophy", "publisher": "Stanford Encyclopedia of Philosophy", "title": "Mill’s Moral and Political Philosophy", "url": "https://plato.stanford.edu/entries/mill-moral-political/"},
];

type HtmlNode = Record<string, unknown> & { ":@"?: Record<string, string> };
const htmlParser = new XMLParser({
  preserveOrder: true, ignoreAttributes: false, parseTagValue: false,
  processEntities: false, trimValues: false,
  unpairedTags: ["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"],
  stopNodes: ["*.script", "*.style"],
});
const ignoredTags = new Set(["script", "style", "nav", "header", "footer", "aside", "form", "figure", "figcaption", "noscript"]);
const tagOf = (node: HtmlNode) => Object.keys(node).find(key => key !== ":@") ?? "";
const childrenOf = (node: HtmlNode): HtmlNode[] => {
  const children = node[tagOf(node)];
  return Array.isArray(children) ? children : [];
};
const hasClass = (node: HtmlNode, name: string) => (node[":@"]?.["@_class"] ?? "").split(/\s+/).includes(name);
const ignored = (node: HtmlNode) => ignoredTags.has(tagOf(node)) ||
  /(?:^|[\s_-])(?:related|teaser|card|promo|recommendations?|newsletter|social|share)(?:[\s_-]|$)/i
    .test(`${node[":@"]?.["@_class"] ?? ""} ${node[":@"]?.["@_id"] ?? ""}`);

function findElement(nodes: HtmlNode[], predicate: (node: HtmlNode) => boolean): HtmlNode | undefined {
  for (const node of nodes) {
    if (ignored(node)) continue;
    if (predicate(node)) return node;
    const found = findElement(childrenOf(node), predicate);
    if (found) return found;
  }
}

function elementText(node: HtmlNode): string {
  if (ignored(node)) return "";
  if (tagOf(node) === "#text") return String(node["#text"] ?? "");
  if (tagOf(node) === "br") return " ";
  return childrenOf(node).map(elementText).join("");
}

/** Select one coherent prose section. Page modules and their teaser prose are not an article. */
export function articleExcerpt(html: string): string {
  if (html.length > 1_000_000) return "";
  // Ordinary HTML doctype is harmless; never allow DTDs or entity declarations.
  const cleaned = html.replace(/<!doctype\s+html\s*>/gi, "");
  if (/<!DOCTYPE|<!ENTITY/i.test(cleaned)) return "";
  try {
    const nodes = htmlParser.parse(cleaned) as HtmlNode[];
    const stanford = findElement(nodes, node => node[":@"]?.["@_id"] === "aueditable");
    // American Cinematographer's single-article layout uses a div for its body;
    // its <article> elements are recommendation tiles, not the requested story.
    const singleArticle = findElement(nodes, node =>
      node[":@"]?.["@_data-elementor-type"] === "single-post" &&
      hasClass(node, "elementor-location-single") && hasClass(node, "type-article"));
    const articleBody = singleArticle && findElement(childrenOf(singleArticle), node =>
      hasClass(node, "article-template-content") &&
      node[":@"]?.["@_data-widget_type"] === "theme-post-content.default");
    const article = findElement(nodes, node => tagOf(node) === "article");
    const root = stanford
      ? findElement(childrenOf(stanford), node => node[":@"]?.["@_id"] === "main-text") ?? stanford
      : singleArticle ? articleBody
        : article && (findElement(childrenOf(article), node => hasClass(node, "entry-content")) ?? article);
    if (!root) return "";
    const sections: string[][] = [[]];
    const boundary = () => { if (sections.at(-1)!.length) sections.push([]); };
    const addParagraph = (node: HtmlNode) => {
      const text = plainText(elementText(node));
      // Truncated teaser sentences are never expanded into a purported full article.
      if (text && !/(?:…|\.\.\.)[”"')\]]?$/.test(text)) sections.at(-1)!.push(text);
      else if (text) boundary();
    };
    if (article && hasClass(article, "type-topic")) {
      // NASA topic pages interleave independently linked stories and fact cards.
      // Only their direct WordPress prose is eligible; never flatten nested modules.
      for (const node of childrenOf(root)) {
        if (tagOf(node) === "#text" && !String(node["#text"] ?? "").trim()) continue;
        if (tagOf(node) === "p" && hasClass(node, "wp-block-paragraph")) addParagraph(node);
        else boundary();
      }
    } else {
      const walk = (children: HtmlNode[]) => {
        for (const node of children) {
          const tag = tagOf(node);
          if (ignored(node) || tag === "article" || node[":@"]?.["@_id"] === "bibliography") { boundary(); continue; }
          if (/^h[1-6]$/.test(tag) || tag === "section") boundary();
          if (tag === "p") addParagraph(node);
          else walk(childrenOf(node));
          if (tag === "section") boundary();
        }
      };
      walk(childrenOf(root));
    }
    const section = sections.find(paragraphs => paragraphs.join("\n\n").length >= 300)
      ?? sections.find(paragraphs => paragraphs.length);
    if (!section) return "";
    // Keep complete paragraphs at the existing 6,000-character cap.
    const bounded: string[] = [];
    for (const paragraph of section) {
      if ([...bounded, paragraph].join("\n\n").length > 6000) break;
      bounded.push(paragraph);
    }
    return bounded.join("\n\n");
  } catch {
    // Known source layouts can change; skip unreadable HTML instead of using page chrome.
    return "";
  }
}

/**
 * Shelf pages from publishers with an inspected body adapter use that adapter's first
 * coherent section, never joining across its module boundaries. Pages whose layout the
 * adapter does not recognize keep the generic single-section reader reviewed for them.
 */
export function shelfExcerpt(html: string, publisher: string): string {
  if (hasArticleAdapter(publisher)) {
    const sections = sourceArticleSections(html, publisher);
    const section = sections.find(text => text.length >= 300);
    if (section) return section;
  }
  return articleExcerpt(html);
}

/** Pages that can no longer be retrieved within the existing rules; kept for history, never fetched. */
export const isRetired = (source: (typeof EVERGREEN_SOURCES)[number]) => Boolean(source.retired);

export async function collectEvergreen(now: Date, fetchImpl: typeof fetch, coveredUrls: ReadonlySet<string> = new Set()): Promise<SourcePacket[]> {
  const covered = coveredUrlKeys(coveredUrls);
  const shelf = EVERGREEN_SOURCES.filter(source => !covered.has(coverageUrl(source.url)) && !isRetired(source));
  const retired = EVERGREEN_SOURCES.filter(isRetired).length;
  console.log(`[sources] Evergreen shelf: ${shelf.length}/${EVERGREEN_SOURCES.length} unconsumed articles (${retired} retired)`);
  const results = await Promise.allSettled(shelf.map(async (source) => {
    const response = await fetchImpl(source.url, {
      signal: AbortSignal.timeout(20_000), redirect: "error",
      headers: { Accept: "text/html" },
    });
    const excerpt = shelfExcerpt(await readBounded(response), source.publisher);
    if (excerpt.length < 300) throw new Error("Insufficient article prose");
    return {
      ...source, excerpt, evergreen: true,
      id: createHash("sha256").update(source.url).digest("hex").slice(0, 16),
      retrievedAt: now.toISOString(),
      // A retrieval date must never masquerade as a publication date.
    } satisfies SourcePacket;
  }));
  return results.flatMap((result, index) => {
    if (result.status === "fulfilled") return [result.value];
    console.warn(`[sources] Evergreen article unavailable: ${shelf[index].title} (${failureReason(result.reason)}); skipping`);
    return [];
  });
}
