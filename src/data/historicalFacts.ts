export interface HistoricalFact {
  id: string;
  category: 'city' | 'reactor' | 'water' | 'life' | 'geography';
  title: string;
  shortText: string;
  fullText: string;
  wikiUrls?: {
    en?: string;
    ru?: string;
  };
  trigger: {
    type: 'day' | 'building' | 'milestone';
    value: number | string;
  };
}

export const HISTORICAL_FACTS: HistoricalFact[] = [
  // === DAY-BASED TRIGGERS ===
  {
    id: 'welcome-aktau',
    category: 'city',
    title: 'Welcome to Aktau',
    shortText:
      "In 1963, the Soviet Union began building a city in one of Earth's most inhospitable deserts...",
    fullText: `In 1963, Soviet planners chose an unlikely location for a new city: the sun-scorched Mangyshlak Peninsula on the eastern shore of the Caspian Sea. With summer temperatures exceeding 40°C and virtually no fresh water for hundreds of kilometers, it seemed an impossible place for human habitation.

Yet this desolate landscape held something valuable—vast oil and uranium deposits. The Soviets named the settlement Aktau, meaning "White Mountain" in Kazakh, after the chalk-colored cliffs that line the coast.

What made Aktau possible wasn't just Soviet determination—it was nuclear power. The city would become the world's first to depend entirely on a nuclear reactor for both electricity AND drinking water.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Aktau',
      ru: 'https://ru.wikipedia.org/wiki/Актау'
    },
    trigger: { type: 'day', value: 1 }
  },
  {
    id: 'mangyshlak-peninsula',
    category: 'geography',
    title: 'The Mangyshlak Peninsula',
    shortText:
      'The Mangyshlak Peninsula is one of the driest places on Earth, receiving less than 150mm of rain annually.',
    fullText: `The Mangyshlak Peninsula juts into the Caspian Sea from Kazakhstan's western coast. It's a land of extremes: scorching summers, freezing winters, and an annual rainfall of just 100-150mm—comparable to the Sahara Desert.

The peninsula sits on the Ustyurt Plateau, a vast limestone tableland that extends across western Kazakhstan and Uzbekistan. Ancient seabeds left behind rich deposits of oil, gas, and uranium, making the region strategically vital despite its harsh climate.

Before Aktau, the only inhabitants were nomadic Kazakh herders who knew the few precious springs and wells. Soviet geologists arriving in the 1950s faced the same challenge as these ancient nomads: how to find water in a waterless land.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Mangystau_Region',
      ru: 'https://ru.wikipedia.org/wiki/Мангистауская_область'
    },
    trigger: { type: 'day', value: 5 }
  },
  {
    id: 'bn350-intro',
    category: 'reactor',
    title: 'BN-350: A World First',
    shortText:
      "The BN-350 was the world's first industrial fast breeder reactor, commissioned in 1973.",
    fullText: `On July 16, 1973, the BN-350 reactor achieved criticality, marking a milestone in nuclear history. It was the world's first industrial-scale fast breeder reactor—a design that could produce more nuclear fuel than it consumed.

"BN" stands for "Bystry Neytrony" (Fast Neutrons). Unlike conventional reactors that slow neutrons with water, fast breeders use liquid sodium as coolant, allowing neutrons to maintain high energy. This enables the reactor to convert uranium-238 into plutonium-239, effectively "breeding" new fuel.

But the BN-350 had another unique mission: desalination. Half its 1,000 MW thermal output went to generating electricity, while the other half powered the world's largest nuclear desalination plant, producing 120,000 cubic meters of fresh water daily.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/BN-350_reactor',
      ru: 'https://ru.wikipedia.org/wiki/БН-350'
    },
    trigger: { type: 'day', value: 10 }
  },
  {
    id: 'desalination-tech',
    category: 'water',
    title: 'Turning Sea to Fresh',
    shortText:
      "Aktau's desalination plants used multi-stage flash distillation, boiling seawater in a chain of chambers.",
    fullText: `The desalination plants at Aktau used a process called multi-stage flash (MSF) distillation. Seawater enters a series of chambers, each at lower pressure than the last. As pressure drops, water "flashes" into steam at progressively lower temperatures.

The steam is captured and condensed into pure fresh water, while concentrated brine is returned to the sea. The BN-350's waste heat—normally discarded in conventional power plants—became the engine driving this transformation.

At peak operation, Aktau's desalination complex produced 120,000 cubic meters of fresh water per day—enough to fill 48 Olympic swimming pools. This made it the largest nuclear desalination facility ever built, a record it held until the plant's closure in 1999.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Multi-stage_flash_distillation',
      ru: 'https://ru.wikipedia.org/wiki/Опреснение_воды'
    },
    trigger: { type: 'day', value: 20 }
  },
  {
    id: 'closed-city',
    category: 'life',
    title: 'The Secret City',
    shortText:
      'Until 1991, Aktau was a "closed city" known only as Shevchenko, invisible on Soviet maps.',
    fullText: `For nearly three decades, Aktau didn't officially exist. From 1964 to 1991, it was designated a "closed city"—one of dozens of secret Soviet settlements hidden from maps and forbidden to foreigners.

The city was known only by its code name: Shevchenko, after the Ukrainian poet Taras Shevchenko, who was exiled to the Mangyshlak region in the 1850s. Residents needed special permits to live there, and even Soviet citizens from other regions couldn't visit without authorization.

The secrecy wasn't just about the nuclear reactor. Aktau was also home to uranium enrichment facilities and a fast breeder research program that had military implications. Only after the Soviet collapse in 1991 was the city opened and renamed Aktau.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Closed_city',
      ru: 'https://ru.wikipedia.org/wiki/Закрытое_административно-территориальное_образование'
    },
    trigger: { type: 'day', value: 30 }
  },
  {
    id: 'peak-population',
    category: 'life',
    title: 'City of 150,000',
    shortText:
      'At its peak, Aktau sustained 150,000 people entirely through nuclear-powered desalination.',
    fullText: `By the 1980s, Aktau had grown from a desert outpost to a thriving city of 150,000 people. Every drop of water they drank, every shower they took, every meal they cooked—all depended on the BN-350 reactor and its desalination plants.

The city became a showcase of Soviet urban planning. Wide boulevards, extensive parks (irrigated with desalinated water), a university, cultural centers, and modern apartment blocks made it one of the most livable cities in Central Asia.

Workers came from across the Soviet Union, attracted by high salaries, good housing, and the prestige of working on cutting-edge nuclear technology. Many stayed for generations, creating a unique community bonded by their shared dependence on the reactor that made their city possible.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Aktau#Demographics',
      ru: 'https://ru.wikipedia.org/wiki/Актау#Население'
    },
    trigger: { type: 'day', value: 50 }
  },
  {
    id: 'caspian-sea',
    category: 'geography',
    title: 'The Caspian Sea',
    shortText:
      "The Caspian is the world's largest lake, though its slightly salty water made desalination essential.",
    fullText: `Despite its name, the Caspian Sea is technically the world's largest lake, covering 371,000 square kilometers—larger than Germany. It's an ancient remnant of the Paratethys Sea that once connected the Mediterranean to Central Asia.

The Caspian's salinity averages about 1.2%—roughly one-third that of ocean water. While not as salty as seawater, it's still far too saline for drinking or agriculture. This made desalination essential for any large settlement on its shores.

The sea's level has fluctuated dramatically over centuries, sometimes by several meters. Soviet engineers had to account for these changes when designing Aktau's seawater intake systems, building them to handle both rising and falling water levels.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Caspian_Sea',
      ru: 'https://ru.wikipedia.org/wiki/Каспийское_море'
    },
    trigger: { type: 'day', value: 75 }
  },
  {
    id: 'shutdown',
    category: 'reactor',
    title: 'End of an Era',
    shortText:
      "In 1999, the BN-350 was shut down after 26 years of operation, ending Aktau's nuclear age.",
    fullText: `On April 22, 1999, the BN-350 reactor was permanently shut down after 26 years of operation. The decision came not from any accident, but from the economic realities of post-Soviet Kazakhstan and the reactor's aging systems.

The shutdown posed an unprecedented challenge: how to decommission a fast breeder reactor while ensuring the city it powered could survive. Kazakhstan, with international help, converted Aktau to conventional power sources and built new desalination plants powered by natural gas.

Today, the BN-350's legacy lives on. Its operational data helped design newer fast breeder reactors worldwide, and its unique dual-purpose design proved that nuclear desalination could work at industrial scale. The reactor building still stands, gradually being decommissioned—a monument to one of history's boldest experiments in nuclear-powered urban survival.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/BN-350_reactor#Decommissioning',
      ru: 'https://ru.wikipedia.org/wiki/БН-350#История'
    },
    trigger: { type: 'day', value: 100 }
  },

  // === BUILDING-BASED TRIGGERS ===
  {
    id: 'first-pump',
    category: 'water',
    title: 'Drawing from the Caspian',
    shortText:
      "Aktau's seawater intake pumps operated 24/7, drawing millions of liters daily from the Caspian.",
    fullText: `The seawater pumping stations were the first link in Aktau's water chain. Located along the Caspian shore, massive pumps drew raw seawater through intake pipes that extended hundreds of meters into the sea.

The intake design had to solve several challenges: preventing marine life from entering the system, handling the Caspian's fluctuating water levels, and ensuring continuous operation even during fierce winter storms that could freeze exposed equipment.

At peak operation, these pumps delivered over 400,000 cubic meters of seawater daily to the desalination plants. The brine discharge—concentrated salt water left after desalination—was carefully dispersed to minimize impact on local marine ecosystems.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Desalination#Cogeneration',
      ru: 'https://ru.wikipedia.org/wiki/Мангистауский_атомно-энергетический_комбинат'
    },
    trigger: { type: 'building', value: 'pump' }
  },
  {
    id: 'first-reactor',
    category: 'reactor',
    title: 'Heart of the City',
    shortText:
      'The BN-350 used liquid sodium coolant at 500°C—hot enough to glow orange in the dark.',
    fullText: `The BN-350 was an engineering marvel of its time. Its core contained 369 fuel assemblies bathed in liquid sodium heated to 500°C. At this temperature, sodium glows with a faint orange light, earning fast breeder reactors the nickname "liquid sunshine."

Why sodium? Unlike water, it doesn't slow neutrons, allowing the "fast" breeding process. It also has excellent heat transfer properties and doesn't corrode steel at high temperatures. The drawback: sodium burns violently in air and explodes on contact with water, requiring extraordinary safety measures.

The reactor's thermal output of 1,000 MW was split between two purposes: half drove turbines generating 150 MW of electricity, while the other half provided steam for the desalination plants. This dual-purpose design made the BN-350 unique in nuclear history.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Liquid_metal_cooled_reactor',
      ru: 'https://ru.wikipedia.org/wiki/Реактор_на_быстрых_нейтронах'
    },
    trigger: { type: 'building', value: 'reactor' }
  },
  {
    id: 'first-distiller',
    category: 'water',
    title: 'The Flash Chambers',
    shortText:
      'In each distillation stage, seawater "flashed" into steam as pressure dropped—no boiling required.',
    fullText: `Aktau's desalination plants contained rows of massive steel chambers, each operating at slightly lower pressure than the last. Hot seawater entering each chamber would instantly "flash" into steam, even at temperatures below 100°C, because of the reduced pressure.

This multi-stage flash (MSF) process was remarkably efficient. By using 40 or more stages, engineers could extract fresh water while keeping the temperature drop per stage to just 2-3°C. The waste heat from the reactor—normally discarded—became the system's power source.

The plants ran continuously for decades, producing water that met strict Soviet drinking standards. Operators monitored hundreds of valves, pumps, and sensors to keep the delicate balance of temperature and pressure across all stages.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Multi-stage_flash_distillation',
      ru: 'https://en.wikipedia.org/wiki/Multi-stage_flash_distillation'
    },
    trigger: { type: 'building', value: 'distiller' }
  },
  {
    id: 'first-housing',
    category: 'life',
    title: 'Soviet Microrayons',
    shortText:
      "Aktau's apartment blocks, called microrayons, were designed to house entire neighborhoods as self-contained units.",
    fullText: `The residential buildings of Aktau followed the Soviet "microrayon" model—self-contained neighborhood units with housing, schools, shops, and services all within walking distance. Each microrayon housed 5,000-15,000 residents.

These prefabricated concrete buildings could be assembled quickly using standardized panels. While often criticized for their uniformity, they provided modern amenities—central heating, running water, electricity—that were luxuries in much of the Soviet Union.

In Aktau, these buildings had special significance: their central heating came directly from the reactor's steam system, and their water from nuclear-powered desalination. Residents lived intimately connected to the technology that made their desert home possible.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Microdistrict',
      ru: 'https://ru.wikipedia.org/wiki/Микрорайон'
    },
    trigger: { type: 'building', value: 'microrayon' }
  },
  {
    id: 'first-tank',
    category: 'water',
    title: 'Desert Water Storage',
    shortText:
      "Aktau's water tanks held reserves for emergencies—vital when a single reactor supplied an entire city.",
    fullText: `Water storage was critical in Aktau. If the reactor or desalination plants needed maintenance, the city had to survive on reserves. Massive storage tanks held millions of liters of desalinated water, providing a buffer against any interruption in supply.

The tanks also helped manage daily demand fluctuations. Water consumption peaked in mornings and evenings, while the desalination plants ran most efficiently at constant output. Storage allowed the plants to run steadily while meeting variable demand.

In the extreme desert climate, these tanks required special design. Insulation prevented freezing in winter (temperatures could drop to -30°C) and limited evaporation in summer. Underground tanks stayed cooler but required pumps; elevated tanks used gravity but needed more maintenance.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Water_storage',
      ru: 'https://ru.wikipedia.org/wiki/Водонапорная_башня'
    },
    trigger: { type: 'building', value: 'water_tank' }
  },
  {
    id: 'five-buildings',
    category: 'city',
    title: 'City Planning in the Desert',
    shortText:
      'Aktau was carefully planned to minimize water loss—wide streets reduced dust, parks provided cooling.',
    fullText: `Soviet planners designed Aktau with the desert climate in mind. Wide boulevards oriented to catch sea breezes provided natural cooling. Parks and tree-lined streets—all irrigated with desalinated water—created shade and reduced ambient temperatures by several degrees.

The city layout clustered residential areas near the coast where temperatures were milder, while industrial facilities sat inland. This separation protected residents from industrial emissions while keeping the reactor close to its seawater source.

Buildings were oriented to minimize sun exposure on their longest walls. Light-colored facades reflected heat, and deep balconies provided shade. These passive cooling strategies reduced the enormous energy demand that would otherwise be needed for air conditioning.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Urban_planning_in_Communist_countries',
      ru: 'https://ru.wikipedia.org/wiki/Городское_планирование_в_СССР'
    },
    trigger: { type: 'building', value: 5 }
  },
  {
    id: 'ten-buildings',
    category: 'reactor',
    title: 'Soviet Nuclear Achievement',
    shortText:
      'The BN-350 operated for 26 years with no major incidents—a remarkable safety record for early fast breeder technology.',
    fullText: `The BN-350's safety record was exceptional. Over 26 years of operation, it never experienced a major accident—remarkable for pioneering technology. Several sodium leaks occurred, but containment systems prevented any release of radioactivity.

This success required constant vigilance. Soviet nuclear workers were highly trained, and the closed-city status meant authorities could carefully select who lived and worked there. Operators underwent years of training before being allowed to control the reactor.

The reactor's design included multiple safety systems: neutron-absorbing control rods that could shut down the chain reaction in seconds, backup cooling systems, and containment structures designed to survive any credible accident. These features informed the design of later fast breeder reactors worldwide.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Soviet_nuclear_power',
      ru: 'https://ru.wikipedia.org/wiki/Ядерная_энергетика_СССР'
    },
    trigger: { type: 'building', value: 10 }
  },

  // === MILESTONE TRIGGERS ===
  {
    id: 'population-200',
    category: 'life',
    title: 'Growing the Desert City',
    shortText:
      'New residents arrived by train across hundreds of kilometers of empty steppe to build their future in Aktau.',
    fullText: `Workers came to Aktau from across the Soviet Union, drawn by good salaries, modern housing, and the excitement of pioneering a new city. The journey itself was an adventure—a long train ride across the empty Kazakh steppe, ending at a city that appeared like a mirage on the desert shore.

New arrivals found a surprisingly cosmopolitan community. Russians, Kazakhs, Ukrainians, and dozens of other nationalities lived and worked together. The shared challenge of desert life created strong bonds, and many families stayed for generations.

The city offered amenities rare in Soviet Central Asia: reliable electricity and water, good schools, a university, theaters, and sports facilities. For many, Aktau represented the Soviet promise of modernity—a future built on science and technology.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Aktau#History',
      ru: 'https://ru.wikipedia.org/wiki/Актау#История'
    },
    trigger: { type: 'milestone', value: 'population_200' }
  },
  {
    id: 'population-500',
    category: 'city',
    title: 'Aktau at Its Peak',
    shortText:
      'By the 1980s, Aktau was one of the most modern cities in Central Asia—all powered by a single reactor.',
    fullText: `At its zenith in the 1980s, Aktau represented the height of Soviet techno-optimism. A city of over 100,000 people thrived in one of Earth's most inhospitable environments, sustained entirely by nuclear technology.

The city boasted amenities that were rare even in Soviet capitals: reliable hot water year-round, consistent electricity, tree-lined boulevards, and green parks in the middle of the desert. The BN-350 made it all possible, its humming generators the heartbeat of urban life.

This achievement came at enormous cost. The reactor, desalination plants, and city infrastructure represented billions of rubles of investment. Only the Soviet state's ability to mobilize resources without regard for economic return could have built such a city. It was a triumph of central planning—and perhaps its most ambitious monument.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/Aktau',
      ru: 'https://ru.wikipedia.org/wiki/Актау'
    },
    trigger: { type: 'milestone', value: 'population_500' }
  },
  {
    id: 'survive-winter',
    category: 'life',
    title: 'Winter in the Desert',
    shortText:
      "Aktau's winters could drop to -30°C. District heating from the reactor kept 150,000 people warm.",
    fullText: `The Mangyshlak Peninsula experiences extreme continental climate—scorching summers and bitter winters. Temperatures can swing from +45°C in July to -30°C in January, with fierce winds that make it feel even colder.

Surviving winter required massive amounts of heat. The BN-350's steam system didn't just produce electricity and fresh water—it also fed a district heating network that warmed every building in the city. Hot water pipes ran beneath streets and into every apartment block.

If the reactor shut down in winter, the city would freeze within hours. This single point of failure drove engineers to build redundancy into every system. Backup boilers, stored fuel, and emergency procedures were constantly maintained against the day they might be needed.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/District_heating',
      ru: 'https://ru.wikipedia.org/wiki/Центральное_теплоснабжение'
    },
    trigger: { type: 'milestone', value: 'survive_winter' }
  },
  {
    id: 'reactor-warning',
    category: 'reactor',
    title: 'BN-350 Safety Systems',
    shortText:
      'When temperatures rose, operators had seconds to respond. Multiple safety systems could shut down the reactor automatically.',
    fullText: `Fast breeder reactors operate with tighter margins than conventional nuclear plants. The BN-350's liquid sodium coolant could not be allowed to boil, and core temperatures had to stay within precise limits to prevent fuel damage.

When sensors detected abnormal conditions, automatic systems could insert control rods within seconds, stopping the chain reaction. Additional neutron-absorbing balls could drop into the core by gravity alone, providing shutdown capability even if all power was lost.

The operators' control room displayed thousands of parameters on massive panels. Alarms would sound at the first sign of trouble, and strict procedures dictated exactly how to respond to each scenario. This discipline was essential—in a fast breeder, there's no time for improvisation.`,
    wikiUrls: {
      en: 'https://en.wikipedia.org/wiki/BN-350_reactor#Design',
      ru: 'https://ru.wikipedia.org/wiki/БН-350#Устройство'
    },
    trigger: { type: 'milestone', value: 'reactor_warning' }
  }
];

export function getFactByTrigger(type: string, value: number | string): HistoricalFact | undefined {
  return HISTORICAL_FACTS.find(
    (fact) => fact.trigger.type === type && fact.trigger.value === value
  );
}

export function getFactById(id: string): HistoricalFact | undefined {
  return HISTORICAL_FACTS.find((fact) => fact.id === id);
}

export function getFactsByCategory(category: HistoricalFact['category']): HistoricalFact[] {
  return HISTORICAL_FACTS.filter((fact) => fact.category === category);
}
