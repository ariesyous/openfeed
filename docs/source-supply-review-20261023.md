# Source supply review — October 23, 2026

**More lasting reading: a 72-page shelf refill, two recurring lasting feeds and
per-edition shelf pacing.** The reviewed shelf grows **100 → 172** pages, and
unconsumed, fetchable shelf supply goes **10 → 82**: 28 film, 16 economics, 11
mythology and the ancient world, 10 Sopranos, 10 science and 7 philosophy. BFI film
criticism and the Antigone classics journal join intake through new inspected body
adapters. Each edition now publishes at most **three** shelf pages. This is
**source packet validation**, not observed generated-article quality. No generation
was run, and the #36/#37 observation counts are unchanged.

## Diagnosis

Baseline: main `fd87baa`. From October 9 to 22 there were 65 editions and 1,049
posts. Only 82 (7.8%) were lasting reading: 23 shelf pages, 19 feed items more than
72 hours old, and 40 fresh essays from Aeon, JSTOR Daily, Psyche, Senses of Cinema
and Quanta. The reader asked for about half. 96% of posts cited feed items no more
than 72 hours old.

- **The October 22 refill was spent in a day.** All 23 shelf posts came on October
  22, up to **seven** in a single edition. Only the two-per-publisher rule limited
  shelf use. By October 23, 10 of 100 shelf pages were left: 4 Sopranos and 6
  philosophy. Mythology, film, economics and science had none.
- **Film meant trade press.** Film was 19% of posts, but 165 of 202 came from
  Variety and Deadline. No recurring film-criticism source had a body adapter.

## Shelf refill

Discovery used publisher sitemaps (JSTOR Daily, American Cinematographer), Aeon
section pages, Guardian Sopranos tag pages 6–10, and Stanford Encyclopedia,
Internet Encyclopedia and NASA URLs. All 131 candidates were screened through the
production shelf path on October 23, between 04:58 and 05:05 UTC:
- HTTPS, no redirects, the 20-second timeout and the 1 MB bounded reader;
- the same extractor (`shelfExcerpt`: the publisher adapter's first section of at
  least 300 characters, otherwise the generic reader) and the `prepareEvidence`
  12-snippet cap;
- each host's `robots.txt` rules for `*`, which allowed all 131 pages, with a
  five-second gap between Guardian requests for its crawl delay;
- existing URL and normalized-title coverage. One Aeon essay was already covered
  through the Aeon feed. No consumed URL was revived.

Each addition has a complete, specific angle within **three** evidence IDs,
including every split-sentence part. Attribution is limited to what the selected
IDs say: where a name or film title sits only in an unselected snippet, the
addition's limitation says so. Each also has a manually written probe that passes
`validateCitedDraft`. Two Sopranos additions concern the finale; they are
`spoilers: true` with non-revealing angles. Pages were excluded when the payoff
needed more than three IDs, the topic never reached the offered evidence, the
angle repeated a consumed page, the claim depended on a disputed self-account, or
the page was a dated news item.

The ledger
[`fixtures/source-supply-review-20261023.json`](fixtures/source-supply-review-20261023.json)
records, for every candidate:
- retrieval time, status, hashes and lengths, and which extraction path applied;
- all offered evidence and the selected IDs;
- probes and limitations;
- page-reported author and date metadata, when the page has it;
- reduced offline prefixes through the last offered paragraph.

A final normal-intake recheck through `collectEvergreen` at 05:23 UTC reproduced
exactly the reviewed offered evidence for all 72 additions. All 72 kept an unknown
`publishedAt`.

By publisher: JSTOR Daily 40, Aeon 9, American Cinematographer 8, The Guardian 6,
NASA 5, Stanford Encyclopedia 3, Internet Encyclopedia 1. The two-per-publisher
rule still applies to shelf pages, so JSTOR Daily pages spread across editions.

### Mythology and the ancient world

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| ["Thoughts and Prayers" in Greek Tragedy](https://daily.jstor.org/thoughts-and-prayers-in-greek-tragedy/) (JSTOR Daily) | 1,436 / 11 | E7, E10, E11 | **Add:** Aeschylus's war play, where the drama is prayer |
| [Poisoning like the Romans](https://daily.jstor.org/poisoning-like-the-romans/) (JSTOR Daily) | 825 / 8 | E7, E8 | **Add:** When 'adulteress' meant 'poisoner' in Rome |
| [Everyone in Pompeii Got Takeout, Too](https://daily.jstor.org/everyone-in-pompeii-got-takeout-too/) (JSTOR Daily) | 428 / 3 | E2, E3 | **Add:** Pompeii's 158 snack bars |
| [Political Corruption in Athens and Rome](https://daily.jstor.org/political-corruption-in-athens-and-rome/) (JSTOR Daily) | 1,130 / 11 | E9, E10, E11 | **Add:** When even the Delphic oracle might be bribed |
| [Why Some Spartan Women Had Two Husbands](https://daily.jstor.org/why-some-spartan-women-had-two-husbands/) (JSTOR Daily) | 899 / 11 | E5, E6, E9 | **Add:** Sparta may have let a woman marry two men at once |
| [Fish Addiction: An Ancient Greek Paranoia](https://daily.jstor.org/fish-addiction-an-ancient-greek-paranoia/) (JSTOR Daily) | 2,079 / 12 | E5, E7, E8 | **Add:** The poet who died for a giant octopus |
| [Ancient Rome: A City of Immigrants](https://daily.jstor.org/ancient-rome-a-city-of-immigrants/) (JSTOR Daily) | 2,143 / 12 | E10, E11, E12 | **Add:** Rome's 'Little Middle East' beyond the Tiber |
| [A Roman Feast… of Death!](https://daily.jstor.org/a-roman-feast-of-death/) (JSTOR Daily) | 730 / 8 | E4, E5, E8 | **Add:** Domitian's black banquet for senators |
| [Slave Collars in Ancient Rome](https://daily.jstor.org/slave-collars-in-ancient-rome/) (JSTOR Daily) | 941 / 9 | E7, E8, E9 | **Add:** The 'speaking' slave collars that spoke for the enslaver |
| [The Greek Tragedy Behind Suddenly Last Summer](https://daily.jstor.org/the-greek-tragedy-behind-suddenly-last-summer/) (JSTOR Daily) | 1,437 / 11 | E7, E8, E9 | **Add:** Reading Tennessee Williams through The Bacchae |
| [How did the Roman Empire view nature and its seasons?](https://aeon.co/essays/how-did-the-roman-empire-view-nature-and-its-seasons) (Aeon) | 4,007 / 12 | E1, E2, E7 | **Add:** The goddess on Rome's Altar of Peace nobody can name |
| [Greek Gods and Game Theory](https://daily.jstor.org/greek-gods-and-game-theory/) | 741 / 7 | — | Exclude: No Greek myth reaches the offered evidence; it covers only game theory teaching. |
| [Did Romans Really Fight Rhinos?](https://daily.jstor.org/did-romans-really-fight-rhinos/) | 0 / 0 | — | Exclude: HTTP 200, but no recognized article prose. |
| [Celebrating Solstice the Ancient Greek Way](https://daily.jstor.org/celebrating-solstice-the-ancient-greek-way/) | 655 / 6 | — | Exclude: Only the Haloea's name reaches the evidence; what the festival involved is beyond it. |
| [The Secrets of Pompeii](https://daily.jstor.org/the-secrets-of-pompeii/) | 0 / 0 | — | Exclude: HTTP 200, but no recognized article prose. |
| [The Temple of Apollo on the Ocean Floor](https://daily.jstor.org/temple-of-apollo-ocean-floor/) | 1,218 / 12 | — | Exclude: The payoff (tracing the marble to its quarry) needs four IDs; the temple is never named in the offered evidence. |
| [The Trouble with Authentic Ancient Statues](https://daily.jstor.org/the-trouble-with-authentic-ancient-statues/) | 1,034 / 10 | — | Exclude: Repeats the consumed Aeon painted-statues angle. |
| [Girls and Dolls in the Roman Empire](https://daily.jstor.org/girls-and-dolls-in-the-roman-empire/) | 370 / 4 | — | Exclude: Offered evidence is about Barbie; no Roman content reaches it. |
| [From Ancient Greece to a TikTok Trend](https://daily.jstor.org/from-ancient-greece-to-a-tiktok-trend/) | 0 / 0 | — | Exclude: HTTP 200, but no recognized article prose. |
| [Bring Your Own Applause: What Donald Trump and Roman Emperor Nero Have in Common](https://daily.jstor.org/bring-your-own-applause-what-donald-trump-and-roman-emperor-nero-have-in-common/) | 3,321 / 12 | — | Exclude: Offered evidence is about a 2017 speech; Nero is beyond it. |
| [The Lessons of Due Process in Julius Caesar](https://daily.jstor.org/the-lessons-of-due-process-in-julius-caesar/) | 1,818 / 12 | — | Exclude: Shakespeare and current US politics, not Greek or Roman myth or history. |
| [Culinary Fusion in the Ancient World](https://daily.jstor.org/culinary-fusion-in-the-ancient-world/) | 1,536 / 11 | — | Exclude: Indian Ocean trade, not the Greek or Roman world. |
| [How a playful literary hoax illuminates Classical queerness](https://aeon.co/essays/how-a-playful-literary-hoax-illuminates-classical-queerness) | 1,350 / 11 | — | Exclude: The offered evidence presents the hoax as a real discovery; that it was a hoax is beyond it. |
| [How ancient Greek language expresses a seaborne imagination](https://aeon.co/essays/how-ancient-greek-language-expresses-a-seaborne-imagination) | 2,401 / 11 | — | Exclude: Introduction only; no concrete payoff. |
| [What Thucydides really thought about historical analogies](https://aeon.co/essays/what-thucydides-really-thought-about-historical-analogies) | 5,784 / 12 | — | Exclude: Offered evidence covers only Marx's Eighteenth Brumaire, not Thucydides. |
| [The politics of masculinity at the end of the Roman republic](https://aeon.co/essays/the-politics-of-masculinity-at-the-end-of-the-roman-republic) | 2,133 / 12 | — | Exclude: Already covered through the Aeon feed. |

### Film

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [Beyond The Frame: The Exorcist](https://theasc.com/article/beyond-the-frame-the-exorcist-1973/) (American Cinematographer) | 1,014 / 11 | E1, E2, E7 | **Add:** Lighting The Exorcist's stairwell from above |
| [Beyond The Frame: Blade Runner](https://theasc.com/article/beyond-the-frame-blade-runner-1982/) (American Cinematographer) | 739 / 6 | E1, E4, E5 | **Add:** 'Elegant': John Toll on Jordan Cronenweth |
| [Beyond The Frame: 2001: A Space Odyssey](https://theasc.com/article/beyond-the-frame-2001-a-space-odyssey-1968/) (American Cinematographer) | 1,146 / 9 | E1, E2, E8 | **Add:** The 10,000 Polaroids of 2001: A Space Odyssey |
| ['Seven': Darius Khondji, ASC, AFC's Pioneering Cinematography](https://theasc.com/article/seven-cinematography-khondji-fincher/) (American Cinematographer) | 1,385 / 10 | E6, E9, E10 | **Add:** The seven deadly sins as crime scenes |
| [Behind the Scenes of 'The Deer Hunter'](https://theasc.com/article/the-deer-hunter-cinematography-zsigmond/) (American Cinematographer) | 687 / 7 | E1, E2, E7 | **Add:** Turning summer grass 'California brown' for The Deer Hunter |
| [Photographing Stanley Kubrick’s The Shining](https://theasc.com/article/flashback-the-shining/) (American Cinematographer) | 479 / 4 | E1, E2, E3 | **Add:** How The Shining's cinematographer got his break on 2001 |
| [Wrap Shot: The Godfather](https://theasc.com/article/wrap-shot-the-godfather/) (American Cinematographer) | 2,063 / 12 | E3, E4 | **Add:** Gordon Willis, who changed the way movies looked |
| [Beyond The Frame: The Wizard of Oz](https://theasc.com/article/beyond-the-frame-wizard-of-oz/) (American Cinematographer) | 617 / 5 | E1, E2, E3 | **Add:** Four directors, one cinematographer: The Wizard of Oz |
| [Why does every film and TV series seem to have the same plot?](https://aeon.co/essays/why-does-every-film-and-tv-series-seem-to-have-the-same-plot) (Aeon) | 2,247 / 12 | E4, E6, E12 | **Add:** The one plot almost every film follows |
| [Was Charlie Chaplin's Tramp Un-American?](https://daily.jstor.org/charlie-chaplins-tramp-un-american/) (JSTOR Daily) | 3,065 / 12 | E10, E11, E12 | **Add:** The FBI file that followed Chaplin until his death |
| [Weirdly Enough, Movies about TV Prepared America for TV](https://daily.jstor.org/weirdly-enough-movies-about-tv-prepared-america-for-tv/) (JSTOR Daily) | 587 / 5 | E3, E4, E5 | **Add:** How prewar movies introduced Americans to television |
| [Why Do Rainer Werner Fassbinder's Films Still Resonate?](https://daily.jstor.org/why-do-rainer-werner-fassbinders-films-still-resonate/) (JSTOR Daily) | 1,111 / 10 | E3, E5, E10 | **Add:** Forty features in fifteen years: Fassbinder |
| [How Rotten Tomatoes Changed the Film Industry](https://daily.jstor.org/how-rotten-tomatoes-changed-the-film-industry/) (JSTOR Daily) | 1,358 / 11 | E9, E10, E11 | **Add:** J. Hoberman's verdict on film bloggers |
| [The Last Silent Film Star](https://daily.jstor.org/the-last-silent-film-star/) (JSTOR Daily) | 1,418 / 12 | E5, E6, E7 | **Add:** Baby Peggy, the child star whose parents spent her fortune |
| [How Hollywood Thrived Through the Red Scare](https://daily.jstor.org/how-hollywood-thrived-through-the-red-scare/) (JSTOR Daily) | 1,563 / 12 | E7, E8, E9 | **Add:** The fascism film MGM cancelled |
| [William Faulkner Goes to Hollywood](https://daily.jstor.org/william-faulkner-goes-to-hollywood/) (JSTOR Daily) | 2,358 / 12 | E3, E6 | **Add:** Faulkner's 1,200 pages on de Gaulle |
| [Jerry Lewis: French Film Master](https://daily.jstor.org/jerry-lewis-french-film-master/) (JSTOR Daily) | 589 / 6 | E3, E4, E5 | **Add:** Why the French championed Jerry Lewis |
| [Is Don Quixote to Blame for Modern Movie Reboots?](https://daily.jstor.org/is-don-quixote-to-blame-for-modern-movie-reboots/) (JSTOR Daily) | 1,114 / 10 | E8, E9, E10 | **Add:** Rey as the Star Wars superfan on screen |
| [Why Drive-Ins Were More Than Movie Theaters](https://daily.jstor.org/why-drive-ins-were-more-than-movie-theaters/) (JSTOR Daily) | 1,069 / 8 | E3, E7, E8 | **Add:** What drive-ins offered besides the movie |
| [The Cold War Origins of Interactive Cinema](https://daily.jstor.org/the-cold-war-origins-of-interactive-cinema/) (JSTOR Daily) | 1,758 / 12 | E5, E6, E7 | **Add:** The interactive cinema that debuted at Expo 67 in Montreal |
| [The 1925 Dinosaur Movie That Paved the Way for King Kong](https://daily.jstor.org/the-1925-dinosaur-movie-that-paved-the-way-for-king-kong/) (JSTOR Daily) | 1,008 / 10 | E7, E8, E9 | **Add:** The Lost World and the road to King Kong |
| [Hollywood Froze Out the Founding Mother of Cinema](https://daily.jstor.org/hollywood-froze-out-the-founding-mother-of-cinema/) (JSTOR Daily) | 697 / 7 | E1, E6, E7 | **Add:** Alice Guy and Gaumont's absent-minded go-ahead |
| [The Magic Lantern Shows that Influenced Modern Horror](https://daily.jstor.org/the-magic-lantern-shows-that-influenced-modern-horror/) (JSTOR Daily) | 1,039 / 9 | E5, E8, E9 | **Add:** The ghost show stopped for resurrecting Louis XVI |
| [The First Movie Kiss](https://daily.jstor.org/the-first-movie-kiss/) (JSTOR Daily) | 795 / 7 | E1, E2, E6 | **Add:** The two-second kiss that caused a sensation |
| [How Film Noir Tried to Scare Women out of Working](https://daily.jstor.org/how-film-noir-tried-to-scare-women-out-of-working/) (JSTOR Daily) | 1,771 / 11 | E7, E8, E9 | **Add:** The femme fatale's real threat: ambition |
| [Hitchcock’s Transition from London to Hollywood](https://daily.jstor.org/hitchcocks-transition-from-london-to-hollywood/) (JSTOR Daily) | 2,191 / 11 | E3, E4, E10 | **Add:** Twenty British features before Hollywood |
| [Lon Chaney’s Movie Monsters](https://daily.jstor.org/lon-chaneys-movie-monsters/) (JSTOR Daily) | 901 / 8 | E1, E2, E3 | **Add:** The murder defense that blamed Lon Chaney's face |
| [The Bizarre Marvels of Segundo de Chomón, Father of Spanish Cinema](https://daily.jstor.org/the-bizarre-marvels-of-segundo-de-chomon-father-of-spanish-cinema/) (JSTOR Daily) | 1,663 / 12 | E9, E10, E11 | **Add:** Segundo de Chomón, the father of Spanish cinema |
| [Popcorn: From Ancient Snack to Movie Standby](https://daily.jstor.org/popcorn-from-ancient-snack-to-movie-standby/) | 847 / 10 | — | Exclude: The movie-theater connection is beyond the offered evidence. |
| [Orson Welles at 100](https://daily.jstor.org/orson-welles-100/) | 769 / 7 | — | Exclude: Thin round-up; no concrete payoff in the offered evidence. |
| [William Goldman and the Mystery of Screenwriting](https://daily.jstor.org/william-goldman-and-the-mystery-of-screenwriting/) | 387 / 3 | — | Exclude: Thin: one general claim about uncredited work. |
| [How Fritz Lang’s Flight from Nazi Germany Shaped Hollywood](https://daily.jstor.org/how-fritz-langs-flight-from-nazi-germany-shaped-hollywood/) | 895 / 10 | — | Exclude: Narrates Lang's own, disputed account of the Goebbels meeting as fact without attribution. |
| [Our political moment is ripe for David Cronenberg’s body horror](https://aeon.co/essays/our-political-moment-is-ripe-for-david-cronenbergs-body-horror) | 5,716 / 12 | — | Exclude: Offered evidence is about Foucault; Cronenberg is beyond it. |
| [Beyond The Frame: The French Connection](https://theasc.com/article/beyond-the-frame-the-french-connection-1971/) | 2,063 / 12 | — | Exclude: The available-light payoff with the film named needs four IDs. |
| [Beyond the Frame: Alien](https://theasc.com/article/beyond-the-frame-alien/) | 687 / 7 | — | Exclude: The creature is described only as 'the iconic beast' without the film context in three IDs. |
| [Janusz Kamiński Shoots Spielberg's 'Saving Private Ryan'](https://theasc.com/article/saving-private-ryan-cinematography-kaminski/) | 1,053 / 10 | — | Exclude: Credits list with no concrete payoff. |
| [Vertigo: Hitchcock’s Acrophobic Vision](https://theasc.com/article/flashback-vertigo/) | 407 / 4 | — | Exclude: Generic Hitchcock introduction; Vertigo itself is beyond the evidence. |
| [Photographing Stanley Kubrick’s 'Barry Lyndon'](https://theasc.com/article/flashback-barry-lyndon/) | 972 / 10 | — | Exclude: Present-tense 1970s profile of Kubrick with no date in the evidence. |
| [Wrap Shot: Casablanca](https://theasc.com/article/wrap-shot-casablanca/) | 2,533 / 11 | — | Exclude: Neither Casablanca nor the cinematographer's full name reaches the evidence. |
| [Filming 2001: A Space Odyssey](https://theasc.com/article/filming-2001-a-space-odyssey/) | 865 / 8 | — | Exclude: A rescheduled-interview anecdote with no payoff. |

### The Sopranos

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [James Gandolfini's film career: much more than just another wiseguy](https://www.theguardian.com/culture/2013/jun/20/james-gandolfini-film-career-wiseguy) (The Guardian) | 1,353 / 12 | E7, E8, E9 | **Add:** The duck scene that defined Tony Soprano |
| [Goodbye, James Gandolfini](https://www.theguardian.com/commentisfree/2013/jun/20/james-gandolfini-death-sopranos) (The Guardian) | 1,538 / 11 | E4, E5, E6 | **Add:** The only actor who could inhabit Tony Soprano |
| [The Sopranos finale: David Chase doesn't owe us an explanation](https://www.theguardian.com/tv-and-radio/2015/apr/15/sopranos-finale-david-chase-explanation) (The Guardian) | 4,707 / 12 | E10, E11, E12 | **Add (spoilers):** David Chase on what isn't the point |
| [The Sopranos / Your next box set](https://www.theguardian.com/tv-and-radio/2009/oct/09/box-set-the-sopranos) (The Guardian) | 1,901 / 11 | E5, E6, E7 | **Add:** A mob boss in therapy |
| [Why The Sopranos is the best TV drama of all time](https://www.theguardian.com/tv-and-radio/2010/jan/12/sopranos-best-tv-drama) (The Guardian) | 1,621 / 12 | E7, E8, E12 | **Add:** The network rules The Sopranos broke |
| [The Sopranos begets the cult of Don't Stop Believin'](https://www.theguardian.com/music/2011/jun/12/sopranos-dont-stop-believin-journey) (The Guardian) | 868 / 8 | E1, E4, E5 | **Add (spoilers):** A father's phrase, a 1981 hit and a final scene |
| [James Gandolfini remembered by The Sopranos creator David Chase](https://www.theguardian.com/culture/2013/jun/26/james-gandolfini-sopranos-david-chase) | 751 / 9 | — | Exclude: Interview answers whose speaker is not named in the offered evidence. |
| [Today](https://www.theguardian.com/tv-and-radio/2016/may/17/golden-age-television-the-sopranos-mad-men) | 1,476 / 12 | — | Exclude: About Mad Men, not The Sopranos. |
| [Sopranos](https://www.theguardian.com/us-news/2015/jan/02/sopranos-bada-bing-new-jersey-strip-club) | 753 / 10 | — | Exclude: A dated 2015 crime report. |
| [On with the show: best TV opening credits, from long to short](https://www.theguardian.com/tv-and-radio/2015/jun/28/true-detective-twin-peaks-simpsons-sopranos-opening-credits) | 280 / 0 | — | Exclude: Excerpt under 300 characters; no evidence offered. |
| [Your TV dinners: share your perfect Sopranos meals](https://www.theguardian.com/tv-and-radio/2013/apr/29/your-tv-dinners-sopranos) | 3,359 / 10 | — | Exclude: Reader-photo series introduction; thin Sopranos content. |
| [Screen savers: the untold story of US TV’s showrunners](https://www.theguardian.com/tv-and-radio/2014/oct/28/untold-story-of-us-tv-showrunners) | 1,055 / 10 | — | Exclude: About a showrunner documentary, not The Sopranos. |
| [James Gandolfini: his best Sopranos scenes, in clips](https://www.theguardian.com/culture/2013/jun/20/james-gandolfini-sopranos-scenes-clips) | 480 / 5 | — | Exclude: Clip list with a mobile prompt; describes the finale. |

### Science

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [Why has Venus obsessed so many astronomers?](https://aeon.co/essays/why-has-venus-obsessed-so-many-astronomers) (Aeon) | 1,016 / 9 | E3, E4, E7 | **Add:** The transit of Venus, a once-in-a-century spectacle |
| [How the scientists of the 1960s turned the Moon into a place](https://aeon.co/essays/how-the-scientists-of-the-1960s-turned-the-moon-into-a-place) (Aeon) | 646 / 6 | E3, E5, E6 | **Add:** Fewer than a dozen lunar geologists |
| [How UFOs almost killed the search for life in the Universe](https://aeon.co/essays/how-ufos-almost-killed-the-search-for-life-in-the-universe) (Aeon) | 5,787 / 12 | E11, E12 | **Add:** The 'giggle factor' that dogged the search for alien life |
| [Saturn: Facts](https://science.nasa.gov/saturn/facts/) (NASA) | 417 / 4 | E2, E3, E4 | **Add:** Saturn's rings, Enceladus's jets and Titan's lakes |
| [Mercury: Facts](https://science.nasa.gov/mercury/facts/) (NASA) | 495 / 6 | E4, E5, E6 | **Add:** Closest to the Sun, but not the hottest |
| [Uranus: Facts](https://science.nasa.gov/uranus/facts/) (NASA) | 601 / 6 | E4, E5, E6 | **Add:** The planet Herschel first mistook for a comet or star |
| [Sun: Facts](https://science.nasa.gov/sun/facts/) (NASA) | 664 / 6 | E4, E5, E6 | **Add:** Why the Sun's corona is hotter than its surface layers |
| [Pluto: Facts](https://science.nasa.gov/dwarf-planets/pluto/facts/) (NASA) | 1,533 / 12 | E2, E3, E4 | **Add:** How Pluto stopped being the ninth planet |
| [The Anatomists of Ancient Alexandria](https://daily.jstor.org/the-anatomists-of-ancient-alexandria/) (JSTOR Daily) | 992 / 9 | E4, E7, E8 | **Add:** Alexandria's brief, dark age of dissection |
| [Archimedes Rediscovered: Technology and Ancient History](https://daily.jstor.org/archimedes-rediscovered-technology-and-ancient-history/) (JSTOR Daily) | 1,465 / 12 | E1, E4, E9 | **Add:** The Archimedes texts hidden under a prayer book |
| [A brief history of Stephen Hawking’s greatest equation](https://aeon.co/essays/a-brief-history-of-stephen-hawkings-greatest-equation) | 1,037 / 9 | — | Exclude: The formula is never named in the evidence and the payoff needs four IDs. |
| [Moon Facts - NASA Science](https://science.nasa.gov/moon/facts/) | 0 / 0 | — | Exclude: HTTP 200, but no recognized article prose. |
| [Mars: Facts - NASA Science](https://science.nasa.gov/mars/facts/) | 0 / 0 | — | Exclude: HTTP 200, but no recognized article prose. |
| [https://science.nasa.gov/jupiter/facts/](https://science.nasa.gov/jupiter/facts/) | 0 / 0 | — | Exclude: Request failed under the no-redirect rule. |
| [https://science.nasa.gov/venus/facts/](https://science.nasa.gov/venus/facts/) | 0 / 0 | — | Exclude: Request failed under the no-redirect rule. |
| [https://science.nasa.gov/neptune/facts/](https://science.nasa.gov/neptune/facts/) | 0 / 0 | — | Exclude: Request failed under the no-redirect rule. |
| [https://science.nasa.gov/jupiter/moons/europa/](https://science.nasa.gov/jupiter/moons/europa/) | 0 / 0 | — | Exclude: Request failed under the no-redirect rule. |
| [Enceladus - NASA Science](https://science.nasa.gov/saturn/moons/enceladus/) | 0 / 0 | — | Exclude: HTTP 200, but no recognized article prose. |
| [Kuiper Belt: Facts - NASA Science](https://science.nasa.gov/solar-system/kuiper-belt/facts/) | 0 / 0 | — | Exclude: HTTP 200, but no recognized article prose. |
| [Meteors and Meteorites - NASA Science](https://science.nasa.gov/solar-system/meteors-meteorites/) | 390 / 4 | — | Exclude: Glossary definitions only. |

### Economics

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [How did Kerala go from poor to prosperous among India’s states?](https://aeon.co/essays/how-did-kerala-go-from-poor-to-prosperous-among-indias-states) (Aeon) | 4,103 / 12 | E8, E10, E11 | **Add:** Kerala, from among India's poorest states to among its richest |
| [Why Hume is better at explaining modern capitalism than Marx](https://aeon.co/essays/why-hume-is-better-at-explaining-modern-capitalism-than-marx) (Aeon) | 2,221 / 12 | E5, E6, E7 | **Add:** The capitalist powerhouses built with 'Leftist' policies |
| [The underground bankers who reshape the flow of global money](https://aeon.co/essays/the-underground-bankers-who-reshape-the-flow-of-global-money) (Aeon) | 4,148 / 12 | E9, E10, E11 | **Add:** Flying money, hawala and hundi |
| [How do we deal with the catastrophe of uninsurability?](https://aeon.co/essays/how-do-we-deal-with-the-catastrophe-of-uninsurability) (Aeon) | 4,787 / 12 | E10, E11, E12 | **Add:** No reinsurance, no insurance, no mortgages |
| [A Brief History of the Income Tax](https://daily.jstor.org/a-brief-history-of-the-income-tax/) (JSTOR Daily) | 2,601 / 12 | E9, E10, E11 | **Add:** The justice who called an income tax 'a war of the poor against the rich' |
| [The Origins of Secret Swiss Bank Accounts](https://daily.jstor.org/origins-secret-swiss-bank-accounts/) (JSTOR Daily) | 1,006 / 11 | E7, E8, E11 | **Add:** The story Swiss banks told about their secrecy law |
| [Wampum was Massachusetts' First Legal Currency](https://daily.jstor.org/wampum-was-massachusetts-first-legal-currency/) (JSTOR Daily) | 1,231 / 10 | E1, E9, E10 | **Add:** Wampum, Massachusetts' first legal currency |
| [Madeira, The Island That Helped Invent Capitalism](https://daily.jstor.org/madeira-the-island-that-helped-invent-capitalism/) (JSTOR Daily) | 901 / 8 | E2, E3, E4 | **Add:** Madeira, where Columbus learned the commodity frontier |
| [Why Do We Have “Free Trade” For Televisions, But Not For Corn?](https://daily.jstor.org/why-do-we-have-free-trade-for-tvs-but-not-for-corn/) (JSTOR Daily) | 1,144 / 10 | E6, E7, E8 | **Add:** When tariffs were the government's only tool |
| [A Nation Built on Debt](https://daily.jstor.org/a-nation-built-on-debt/) (JSTOR Daily) | 1,995 / 12 | E9, E10, E11 | **Add:** Why the dollar in your pocket is government debt |
| [The Lemon Gang: Citrus and the Rise of the Mafia](https://daily.jstor.org/the-lemon-gang-citrus-and-the-rise-of-the-mafia/) (JSTOR Daily) | 1,190 / 11 | E3, E6, E7 | **Add:** Sicilian lemons and the origins of the mafia |
| [Putting a Price on a Life](https://daily.jstor.org/putting-a-price-on-a-life/) (JSTOR Daily) | 3,145 / 12 | E6, E7, E8 | **Add:** When buying life insurance seemed immoral, and then not buying it did |
| [Economics in Ancient Greece](https://daily.jstor.org/economics-in-ancient-greece/) (JSTOR Daily) | 1,475 / 12 | E1, E8, E9 | **Add:** The Greek matron as the first homo economicus |
| [Adam Smith’s Moral and Political Philosophy](https://plato.stanford.edu/entries/smith-moral-political/) (Stanford Encyclopedia of Philosophy) | 5,721 / 12 | E1, E2, E3 | **Add:** The Adam Smith book Kant reportedly favored |
| [Bernard Mandeville](https://plato.stanford.edu/entries/mandeville/) (Stanford Encyclopedia of Philosophy) | 5,215 / 12 | E10, E11, E12 | **Add:** Mandeville's hive that tried to root out vice |
| [Adam Smith](https://iep.utm.edu/smith/) (Internet Encyclopedia of Philosophy) | 3,103 / 12 | E1, E6, E10 | **Add:** Adam Smith was not an economist |
| [What Do Bitcoin and Tulips Have In Common?](https://daily.jstor.org/what-do-bitcoin-and-tulips-have-in-common/) | 332 / 4 | — | Exclude: Tulips never reach the offered evidence. |
| [Why Economists Make Terrible Fortunetellers](https://daily.jstor.org/why-economists-make-terrible-fortunetellers/) | 1,702 / 12 | — | Exclude: A dated 2017 forecast round-up. |
| [The Complex Economics of Medieval Convents](https://daily.jstor.org/the-complex-economics-of-medieval-convents/) | 568 / 6 | — | Exclude: About a novel; no economic history reaches the evidence. |
| [The Gold Standard is Bad Economics](https://daily.jstor.org/gold-standard-bad-economics/) | 1,998 / 12 | — | Exclude: The Eichengreen–Temin payoff needs four IDs. |
| [Exploitation](https://plato.stanford.edu/entries/exploitation/) | 506 / 4 | — | Exclude: Definitional scaffolding with no concrete payoff. |
| [Property and Ownership](https://plato.stanford.edu/entries/property/) | 1,075 / 9 | — | Exclude: Table-of-contents scaffolding. |
| [Karl Marx](https://plato.stanford.edu/entries/marx/) | 1,386 / 11 | — | Exclude: Abstract definition of alienation with no concrete payoff. |
| [Instrumental Rationality](https://plato.stanford.edu/entries/rationality-instrumental/) | 4,633 / 12 | — | Exclude: Definitional scaffolding. |
| [https://plato.stanford.edu/entries/money/](https://plato.stanford.edu/entries/money/) | 0 / 0 | — | Exclude: HTTP 404. |
| [Equality](https://plato.stanford.edu/entries/equality/) | 5,201 / 12 | — | Exclude: Definitional scaffolding. |
| [Mandeville, Bernard / Internet Encyclopedia of Philosophy](https://iep.utm.edu/mandevil/) | 1,403 / 11 | — | Exclude: Repeats the SEP Mandeville angle added in this review. |
| [https://iep.utm.edu/marx/](https://iep.utm.edu/marx/) | 0 / 0 | — | Exclude: HTTP 404. |
| [https://iep.utm.edu/hayek/](https://iep.utm.edu/hayek/) | 0 / 0 | — | Exclude: HTTP 404. |
| [https://iep.utm.edu/adam-smith/](https://iep.utm.edu/adam-smith/) | 0 / 0 | — | Exclude: HTTP 404. |
| [Holiday Supply Chain Issues of Ancient Rome](https://daily.jstor.org/holiday-supply-chain-issues-of-ancient-rome/) | 1,003 / 9 | — | Exclude: About the Magi and Christmas, not Roman economics. |

### Philosophy

| Page | Characters / offered IDs | Selected IDs | Decision |
| --- | --- | --- | --- |
| [Mill’s Moral and Political Philosophy](https://plato.stanford.edu/entries/mill-moral-political/) (Stanford Encyclopedia of Philosophy) | 2,923 / 11 | E10, E11 | **Add:** The child raised to be the ultimate utilitarian |

## Recurring lasting feeds

Seven recurring culture and lasting feeds were evaluated on October 23. Two were
added. Both carry blurbs only, and blurbs never count as context, so each needed an
inspected body adapter. The record is
[`fixtures/lasting-feed-review-20261023.json`](fixtures/lasting-feed-review-20261023.json).

| Feed | Result |
| --- | --- |
| [BFI features and reviews](https://www.bfi.org.uk/rss-feed) | **Add** (movies, 30 days). All 30 current item pages have one `EmbeddedArticleText__TextContent-sc-…` text container and yield 300+ characters. |
| [Antigone](https://antigonejournal.com/feed/) | **Add** (Greek and Roman mythology, 3,650 days). All 24 newest essays have one `pf-content` body inside `entry-content` and yield 300+ characters. |
| [Knowable Magazine](https://knowablemagazine.org/rss) | Exclude: article pages serve a Cloudflare challenge. Bot checks are never bypassed. |
| [The Criterion Current](https://www.criterion.com/current/feed) | Exclude: HTTP 403. |
| [History Today](https://www.historytoday.com/feed/rss.xml) | Exclude: HTTP 403. |
| [The Public Domain Review](https://publicdomainreview.org/rss.xml) | Not added: full feed prose, but its archival curiosities fit no reader topic. |
| [RogerEbert.com](https://www.rogerebert.com/feed) | Not added: mostly new-release and festival reviews, which are timely rather than lasting. |

Adapter markers. Both fail closed: no container, or more than one, means no context.
- **BFI:** the one `div` whose class starts with the styled-component name
  `EmbeddedArticleText__TextContent-sc-`. Figures were already excluded.
  Call-to-action, article-grid and block-quote slices are excluded. Reading stops at
  the first divider, which precedes screening notices. Paragraphs that start with
  `►` (for example "► … is in UK cinemas now") are boundaries for every adapter.
- **Antigone:** the one `entry-content` `div`, then its single `pf-content` block.
  Footnote markers and their hidden citations, sharing buttons and the footnote
  table are excluded. Medium-size paragraphs, used for bylines and subheadings, are
  boundaries. Reading stops at the first divider, which precedes the newsletter
  promo and further reading.

The fixture keeps structure-only skeletons of seven inspected pages: real tags and
class names, synthetic prose, and a sentinel in every excluded module. Tests check
that only the synthetic body paragraphs come through. Earlier BFI shelf pages keep
the generic reader they were reviewed with, because their reduced fixtures lack the
new container.

Known limitations: the BFI feed also carries BFI corporate news, and some Antigone
items are competition notices or reader features. The writer and mandatory review
still decide what is worth publishing. Antigone's 3,650-day window admits its 24
newest items, back to March 2026; after those, it adds three to five essays a month.

## Shelf pacing

`EDITORIAL_MAX_SHELF_PAGES = 3`. Each writer request offers only as many shelf
pages as the edition may still publish, taking each topic's first shelf page before
any topic's second (`paceShelf`). A source backs at most one post, so an edition can
never publish more than three shelf pages. Pacing never drops feed candidates.
Unoffered shelf pages are not deferred or marked covered, so later editions can use
them. Offer order, review, citation, publisher, call and deadline rules are
unchanged. See [editorial-offer-order.md](editorial-offer-order.md).

## Expected lasting share

These are estimates from supply, not observations. They assume eight editions a
day of about 20 posts (160 posts), the cadence PR #64 targets. October 9–22
actually averaged 4.6 editions and 75 posts a day.

- **Shelf:** at most 3 of about 20 posts per edition, so up to **15%**. October 22
  editions averaged 4.6 shelf posts uncapped, so the cap should usually bind. At 24
  pages a day, the 82 unconsumed pages last about **3.5 days** (about 6 days at the
  observed cadence). Uncapped, at October 22's rate, they would last about 2 days.
- **Recurring lasting feeds:** existing essay feeds supplied about 4 posts a day
  (2.5%). BFI adds up to two film-criticism posts per edition from two or three new
  items a day: roughly 2–3 posts a day (about 2%) that would otherwise be trade
  press. Antigone can supply up to two per edition from its 24-item backlog, then
  about one essay a week.
- **Total:** roughly **20%** lasting while the shelf lasts, against 7.8% before,
  falling to about **5%** once it runs out. That is still well short of the
  reader's 50%.

Reaching half would take about 80 lasting posts a day. At three shelf pages per
edition, keeping 15% needs about 170 reviewed pages a week. A higher cap raises the
share only until each refill runs out, which then happens sooner. The cap is one
constant in `generator/editorial/limits.ts`.

## Limits and follow-ups

- **Extraction is not fact-checking.** Probes prove provenance against the
  selected text only. Live generation still goes through writer validation and
  mandatory review, which are fallible.
- **The shelf is still finite.** Pacing stretches a refill; it does not replace
  refills. Shelf review remains manual.
- **Every edition still fetches every unconsumed shelf page.** With 82 pages, each
  edition requests 82 pages, 40 of them from JSTOR Daily, although it can use at
  most three. A bounded, rotating fetch is a sensible follow-up.
- **Stanford Encyclopedia evidence keeps raw HTML entities** (for example
  `&rsquo;`), as before.
