/**
 * English translations for Aktau Protocol
 */
export const en = {
  // ============================================
  // HUD (Header)
  // ============================================
  'hud.day': 'DAY',
  'hud.pop': 'POP',
  'hud.water': 'H<sup>2</sup>O',
  'hud.sea': 'SEA',
  'hud.heat': 'HEAT',
  'hud.power': 'PWR',
  'hud.temp': 'TEMP',
  'hud.mood': 'MOOD',
  'hud.save': 'Save Game',
  'hud.load': 'Load Game',
  'hud.volume': 'Music volume',
  'hud.saved': 'SAVED',
  'hud.saveFailed': 'SAVE FAILED',
  'hud.noSave': 'NO SAVE FOUND',
  'hud.loaded': 'LOADED',
  'hud.loadFailed': 'LOAD FAILED',
  'hud.daysLeft': '{days} days left',

  // HUD Tooltips
  'hud.tooltip.day': 'Current game day. Seasons change every 30 days.',
  'hud.tooltip.population': 'City population. Grows when happy and resources are stable. Fleeing citizens = game over.',
  'hud.tooltip.freshWater': 'Fresh drinking water. Produced by desalination plants. Consumed by housing.',
  'hud.tooltip.seawater': 'Raw seawater from Caspian Sea. Extracted by pumps. Used by desalination plants.',
  'hud.tooltip.heat': 'Thermal energy. Produced by reactor and thermal plants. Consumed by desalination and housing. ×2 in winter!',
  'hud.tooltip.electricity': 'Electrical power. Produced by reactor. Consumed by all buildings for maintenance.',
  'hud.tooltip.temp': 'Reactor core temperature. Rises +1°C/tick. Cooled by distillers (-0.8°C each). Meltdown at 100°C!',
  'hud.tooltip.happiness': 'Citizen happiness. Affected by water supply and housing connections. Zero = revolt!',

  // Seasons
  'season.spring': 'Spring (Heat ×{mult})',
  'season.summer': 'Summer (Heat ×{mult})',
  'season.autumn': 'Autumn (Heat ×{mult})',
  'season.winter': 'Winter (Heat ×{mult})',

  // Game Over
  'gameover.title': 'GAME OVER',
  'gameover.meltdown': 'NUCLEAR MELTDOWN',
  'gameover.drought': 'CITY DROUGHT',
  'gameover.freeze': 'CITY FROZEN',
  'gameover.extinction': 'POPULATION EXTINCT',
  'gameover.revolt': 'CITIZENS REVOLT',
  'gameover.survived': 'SURVIVED {days} DAYS',
  'gameover.restart': '[ RESTART ]',
  'gameover.story.meltdown':
    'The BN-350 reactor core exceeded critical temperature. A cloud of radioactive dust spread across the Mangyshlak Peninsula. Aktau was evacuated and became a ghost town, joining Pripyat in the annals of nuclear disasters.',
  'gameover.story.drought':
    'Without fresh water, the desert reclaimed what was never meant to be. The pipes ran dry, the fountains fell silent. One by one, the citizens left for Almaty, leaving behind empty microrayons and rusting infrastructure.',
  'gameover.story.freeze':
    'The bitter Kazakh winter showed no mercy. When the heating failed, pipes burst and buildings cracked. By spring, Aktau was a frozen monument to Soviet ambition—beautiful, silent, and utterly lifeless.',
  'gameover.story.extinction':
    'The last train departed with the final residents. The great experiment of Aktau ended not with a bang, but with the quiet closing of apartment doors. The camels returned to wander streets that once held 150,000 dreams.',
  'gameover.story.revolt':
    'The people had endured enough. Protests erupted in Lenin Square, and soon the Party officials fled. Without central control, the reactor was abandoned. Aktau became a lawless zone, its future uncertain.',

  // ============================================
  // Build Panel
  // ============================================
  'build.title': 'BUILD',
  'build.free': 'Free',
  'build.maxed': 'BUILT',

  // Building Names
  'building.pump.name': 'Water Pump',
  'building.pump.desc': 'Extracts seawater from the Caspian Sea. Build on SEA tiles (teal).',
  'building.reactor.name': 'BN-350 Reactor',
  'building.reactor.desc':
    'Nuclear reactor providing heat and electricity. Build on ROCK tiles (gray). Warning: +1°C/tick!',
  'building.distiller.name': 'Desalination Plant',
  'building.distiller.desc':
    'Converts seawater to freshwater using heat. Also cools the reactor by -0.8°C/tick.',
  'building.microrayon.name': 'Microrayon Housing',
  'building.microrayon.desc':
    'Soviet-style housing block. Consumes water and heat, generates happiness. Build on SAND tiles.',
  'building.water_tank.name': 'Water Tank',
  'building.water_tank.desc': 'Stores up to 50 freshwater. Buffers supply/demand fluctuations.',
  'building.thermal_plant.name': 'Thermal Plant',
  'building.thermal_plant.desc':
    'Fossil fuel power plant. Provides electricity and heat, but less than the reactor.',

  // ============================================
  // Intro Screen (keep title in English)
  // ============================================
  'intro.subtitle': 'Mangyshlak Atomic Energy Complex',
  'intro.year': '1958 — KAZAKH SSR',
  'intro.lore1':
    'In the barren Mangyshlak Peninsula, where the Caspian Sea meets endless desert, Soviet engineers attempted the impossible: building a city where no city should exist.',
  'intro.lore2':
    "<strong>Shevchenko</strong> — a closed nuclear city, hidden from maps. Its beating heart: the <em>BN-350</em>, the world's first fast breeder reactor designed not just for power, but to turn seawater into drinking water.",
  'intro.lore3':
    'For decades, the reactor sustained 150,000 souls in this hostile land. Fresh water flowed. Lights never dimmed. The desert bloomed.',
  'intro.lore4':
    'Then came 1991. The Union fell. The reactor aged. Now renamed <strong>Aktau</strong>, the city faces an uncertain future.',
  'intro.mission':
    'Your mission: manage the delicate balance of water, power, and heat. Keep the reactor stable. Keep the people alive. One miscalculation, and the desert reclaims what was never meant to be.',
  'intro.start': '[ INITIALIZE PROTOCOL ]',
  'intro.controls': 'WASD: move │ QE: rotate │ Scroll: zoom │ Shift+Drag: pan',
  'intro.mute': 'Toggle music',

  // ============================================
  // Tutorial / Mission Panel
  // ============================================
  'tutorial.welcome.header': 'MISSION LOG: AKTAU PROTOCOL',
  'tutorial.welcome.title': 'Welcome, Comrade Engineer',
  'tutorial.welcome.desc':
    'The BN-350 reactor has been established. Your mission: build a self-sustaining city around it.',
  'tutorial.welcome.note': 'Begin by connecting the reactor to the Caspian Sea.',

  'tutorial.pump.header': 'MISSION LOG: STEP 1',
  'tutorial.pump.title': 'Extract Seawater',
  'tutorial.pump.desc':
    'Build a Water Pump in the Caspian Sea to extract seawater for the desalination plant.',
  'tutorial.pump.note': 'Pumps must be placed on sea tiles (teal). Place it near the reactor.',

  'tutorial.desal.header': 'MISSION LOG: STEP 2',
  'tutorial.desal.title': 'Secure Water Supply',
  'tutorial.desal.desc':
    'Build a Desalination Plant to convert seawater into fresh drinking water.',
  'tutorial.desal.note': 'Connect it to both the Water Pump and the Reactor.',

  'tutorial.housing.header': 'MISSION LOG: STEP 3',
  'tutorial.housing.title': 'Prepare for Residents',
  'tutorial.housing.desc':
    'Build Microrayon housing blocks to accommodate workers and their families.',
  'tutorial.housing.note': 'Housing requires water and heat connections.',

  'tutorial.complete.header': 'MISSION LOG: COMPLETE',
  'tutorial.complete.title': 'Mission Successful!',
  'tutorial.complete.desc':
    'Basic infrastructure established. The city of Aktau is ready to grow. Manage your resources wisely.',
  'tutorial.complete.note': 'Good luck, Comrade.',

  'tutorial.progress': 'Progress: {current}/{target} Built',

  // Welcome Overlay
  'welcome.title': 'Welcome, Comrade Engineer',
  'welcome.desc':
    'The BN-350 nuclear reactor has been established on the Mangyshlak Peninsula. The survival of 150,000 souls depends on your ability to desalinate seawater and build shelter from the desert around this nuclear heart.',
  'welcome.note': 'Your first priority: Connect the reactor to the sea.',
  'welcome.button': 'Begin Mission',

  // ============================================
  // Tooltip
  // ============================================
  'tooltip.uses': 'Uses:',
  'tooltip.makes': 'Makes:',
  'tooltip.temp': 'Temp: {temp}°C (+1/tick)',
  'tooltip.cooling': 'Cooling reactor: -0.8°C/tick',
  'tooltip.needs': 'Needs: {missing}',
  'tooltip.noWater': 'No water supply - residents unhappy!',
  'tooltip.disconnected': 'Not connected to network',
  'tooltip.receiving': '← Receiving: {sources}',
  'tooltip.sending': '→ Sending: {targets}',

  // ============================================
  // Chronicle
  // ============================================
  'chronicle.button': 'Historical Chronicle (J)',
  'chronicle.learnMore': 'Learn more...',
  'chronicle.wikiLink': 'Read more on Wikipedia',
  'chronicle.backToArchive': 'Back to Chronicle',
  'chronicle.archiveTitle': 'Historical Chronicle',
  'chronicle.discovered': '{count} / {total} facts discovered',
  'chronicle.reset': 'Reset Discoveries',
  'chronicle.locked': 'Not yet discovered',

  // Chronicle Categories
  'chronicle.category.city': 'City History',
  'chronicle.category.reactor': 'Nuclear Technology',
  'chronicle.category.water': 'Desalination',
  'chronicle.category.life': 'Daily Life',
  'chronicle.category.geography': 'Geography',

  // ============================================
  // Feedback / Hints
  // ============================================
  'feedback.goodJob': '✓ Good job!',

  // Placement errors
  'feedback.pump.tile': '🌊 Pumps → sea tiles (teal)',
  'feedback.reactor.tile': '☢️ Reactors → rock tiles (gray)',
  'feedback.distiller.tile': '💧 Distillers → sand or rock',
  'feedback.microrayon.tile': '🏠 Housing → sand tiles (beige)',
  'feedback.water_tank.tile': '🛢️ Tanks → sand or rock',
  'feedback.thermal_plant.tile': '🏭 Thermal Plant → sand or rock',
  'feedback.needElectricity': '⚡ Need more electricity!',
  'feedback.needWater': '💧 Need more fresh water!',
  'feedback.needHeat': '🔥 Need more heat!',
  'feedback.occupied': '🚫 Tile occupied',
  'feedback.gameOver': '☠️ Game over!',

  // Contextual hints
  'hint.overheat': '⚠️ Reactor overheating! Build Desalination Plants to cool.',
  'hint.lowWater': '💧 Water low! Build more Desalination Plants.',
  'hint.lowPower': '⚡ Low power! Build a Reactor on rock.',
  'hint.buildPump': '🌊 Build a Water Pump on sea tiles (teal area).',
  'hint.buildReactor': '☢️ Build a Reactor on rock tiles (gray) for power.',
  'hint.buildDistiller': '💧 Build a Desalination Plant to make fresh water.',
  'hint.buildHousing': '🏠 Build Housing on sand to grow population.',

  // Diagnostics
  'diagnostic.waterStuck':
    '💧 Fresh water not increasing. Check if distillers are connected to pumps and reactors.',
  'diagnostic.distillerDisconnected': '💧 {count} distiller(s) need water and heat connections.',
  'diagnostic.housingDisconnected': '🏠 {count} housing block(s) need water connections.',
  'diagnostic.freshWaterDeclining': '💧 Fresh water declining. Check distiller connections.',
  'diagnostic.heatStuck': '🔥 Heat not increasing. Check reactor connections.',
  'diagnostic.heatDeclining': '🔥 Heat declining. Check reactor connections.',

  // ============================================
  // Shortcuts Modal
  // ============================================
  'shortcuts.title': 'Keyboard Shortcuts',
  'shortcuts.camera': 'Camera',
  'shortcuts.building': 'Building',
  'shortcuts.general': 'General',
  'shortcuts.pan': 'Pan camera',
  'shortcuts.panDrag': 'Pan camera (drag-style)',
  'shortcuts.rotate': 'Rotate camera',
  'shortcuts.zoom': 'Zoom in/out',
  'shortcuts.panMouse': 'Pan camera (mouse)',
  'shortcuts.center': 'Center map',
  'shortcuts.reset': 'Reset view',
  'shortcuts.cancel': 'Cancel placement',
  'shortcuts.show': 'Show shortcuts',
  'shortcuts.chronicle': 'Historical Chronicle',
  'shortcuts.pause': 'Pause/Resume',
  'shortcuts.mute': 'Mute/Unmute music',
  'shortcuts.close': 'Press <kbd>Esc</kbd> to close',

  // ============================================
  // Historical Facts
  // ============================================
  // Day 1: Welcome to Aktau
  'fact.welcome-aktau.title': 'Welcome to Aktau',
  'fact.welcome-aktau.short':
    "In 1963, the Soviet Union began building a city in one of Earth's most inhospitable deserts...",
  'fact.welcome-aktau.full': `In 1963, Soviet planners chose an unlikely location for a new city: the sun-scorched Mangyshlak Peninsula on the eastern shore of the Caspian Sea. With summer temperatures exceeding 40°C and virtually no fresh water for hundreds of kilometers, it seemed an impossible place for human habitation.

Yet this desolate landscape held something valuable—vast oil and uranium deposits. The Soviets named the settlement Aktau, meaning "White Mountain" in Kazakh, after the chalk-colored cliffs that line the coast.

What made Aktau possible wasn't just Soviet determination—it was nuclear power. The city would become the world's first to depend entirely on a nuclear reactor for both electricity AND drinking water.`,

  // Day 5: Mangyshlak Peninsula
  'fact.mangyshlak-peninsula.title': 'The Mangyshlak Peninsula',
  'fact.mangyshlak-peninsula.short':
    'The Mangyshlak Peninsula is one of the driest places on Earth, receiving less than 150mm of rain annually.',
  'fact.mangyshlak-peninsula.full': `The Mangyshlak Peninsula juts into the Caspian Sea from Kazakhstan's western coast. It's a land of extremes: scorching summers, freezing winters, and an annual rainfall of just 100-150mm—comparable to the Sahara Desert.

The peninsula sits on the Ustyurt Plateau, a vast limestone tableland that extends across western Kazakhstan and Uzbekistan. Ancient seabeds left behind rich deposits of oil, gas, and uranium, making the region strategically vital despite its harsh climate.

Before Aktau, the only inhabitants were nomadic Kazakh herders who knew the few precious springs and wells. Soviet geologists arriving in the 1950s faced the same challenge as these ancient nomads: how to find water in a waterless land.`,

  // Day 10: BN-350 Intro
  'fact.bn350-intro.title': 'BN-350: A World First',
  'fact.bn350-intro.short':
    "The BN-350 was the world's first industrial fast breeder reactor, commissioned in 1973.",
  'fact.bn350-intro.full': `On July 16, 1973, the BN-350 reactor achieved criticality, marking a milestone in nuclear history. It was the world's first industrial-scale fast breeder reactor—a design that could produce more nuclear fuel than it consumed.

"BN" stands for "Bystry Neytrony" (Fast Neutrons). Unlike conventional reactors that slow neutrons with water, fast breeders use liquid sodium as coolant, allowing neutrons to maintain high energy. This enables the reactor to convert uranium-238 into plutonium-239, effectively "breeding" new fuel.

But the BN-350 had another unique mission: desalination. Half its 1,000 MW thermal output went to generating electricity, while the other half powered the world's largest nuclear desalination plant, producing 120,000 cubic meters of fresh water daily.`,

  // Day 20: Desalination Tech
  'fact.desalination-tech.title': 'Turning Sea to Fresh',
  'fact.desalination-tech.short':
    "Aktau's desalination plants used multi-stage flash distillation, boiling seawater in a chain of chambers.",
  'fact.desalination-tech.full': `The desalination plants at Aktau used a process called multi-stage flash (MSF) distillation. Seawater enters a series of chambers, each at lower pressure than the last. As pressure drops, water "flashes" into steam at progressively lower temperatures.

The steam is captured and condensed into pure fresh water, while concentrated brine is returned to the sea. The BN-350's waste heat—normally discarded in conventional power plants—became the engine driving this transformation.

At peak operation, Aktau's desalination complex produced 120,000 cubic meters of fresh water per day—enough to fill 48 Olympic swimming pools. This made it the largest nuclear desalination facility ever built, a record it held until the plant's closure in 1999.`,

  // Day 30: Closed City
  'fact.closed-city.title': 'The Secret City',
  'fact.closed-city.short':
    'Until 1991, Aktau was a "closed city" known only as Shevchenko, invisible on Soviet maps.',
  'fact.closed-city.full': `For nearly three decades, Aktau didn't officially exist. From 1964 to 1991, it was designated a "closed city"—one of dozens of secret Soviet settlements hidden from maps and forbidden to foreigners.

The city was known only by its code name: Shevchenko, after the Ukrainian poet Taras Shevchenko, who was exiled to the Mangyshlak region in the 1850s. Residents needed special permits to live there, and even Soviet citizens from other regions couldn't visit without authorization.

The secrecy wasn't just about the nuclear reactor. Aktau was also home to uranium enrichment facilities and a fast breeder research program that had military implications. Only after the Soviet collapse in 1991 was the city opened and renamed Aktau.`,

  // Day 50: Peak Population
  'fact.peak-population.title': 'City of 150,000',
  'fact.peak-population.short':
    'At its peak, Aktau sustained 150,000 people entirely through nuclear-powered desalination.',
  'fact.peak-population.full': `By the 1980s, Aktau had grown from a desert outpost to a thriving city of 150,000 people. Every drop of water they drank, every shower they took, every meal they cooked—all depended on the BN-350 reactor and its desalination plants.

The city became a showcase of Soviet urban planning. Wide boulevards, extensive parks (irrigated with desalinated water), a university, cultural centers, and modern apartment blocks made it one of the most livable cities in Central Asia.

Workers came from across the Soviet Union, attracted by high salaries, good housing, and the prestige of working on cutting-edge nuclear technology. Many stayed for generations, creating a unique community bonded by their shared dependence on the reactor that made their city possible.`,

  // Day 75: Caspian Sea
  'fact.caspian-sea.title': 'The Caspian Sea',
  'fact.caspian-sea.short':
    "The Caspian is the world's largest lake, though its slightly salty water made desalination essential.",
  'fact.caspian-sea.full': `Despite its name, the Caspian Sea is technically the world's largest lake, covering 371,000 square kilometers—larger than Germany. It's an ancient remnant of the Paratethys Sea that once connected the Mediterranean to Central Asia.

The Caspian's salinity averages about 1.2%—roughly one-third that of ocean water. While not as salty as seawater, it's still far too saline for drinking or agriculture. This made desalination essential for any large settlement on its shores.

The sea's level has fluctuated dramatically over centuries, sometimes by several meters. Soviet engineers had to account for these changes when designing Aktau's seawater intake systems, building them to handle both rising and falling water levels.`,

  // Day 100: Shutdown
  'fact.shutdown.title': 'End of an Era',
  'fact.shutdown.short':
    "In 1999, the BN-350 was shut down after 26 years of operation, ending Aktau's nuclear age.",
  'fact.shutdown.full': `On April 22, 1999, the BN-350 reactor was permanently shut down after 26 years of operation. The decision came not from any accident, but from the economic realities of post-Soviet Kazakhstan and the reactor's aging systems.

The shutdown posed an unprecedented challenge: how to decommission a fast breeder reactor while ensuring the city it powered could survive. Kazakhstan, with international help, converted Aktau to conventional power sources and built new desalination plants powered by natural gas.

Today, the BN-350's legacy lives on. Its operational data helped design newer fast breeder reactors worldwide, and its unique dual-purpose design proved that nuclear desalination could work at industrial scale. The reactor building still stands, gradually being decommissioned—a monument to one of history's boldest experiments in nuclear-powered urban survival.`,

  // Building: First Pump
  'fact.first-pump.title': 'Drawing from the Caspian',
  'fact.first-pump.short':
    "Aktau's seawater intake pumps operated 24/7, drawing millions of liters daily from the Caspian.",
  'fact.first-pump.full': `The seawater pumping stations were the first link in Aktau's water chain. Located along the Caspian shore, massive pumps drew raw seawater through intake pipes that extended hundreds of meters into the sea.

The intake design had to solve several challenges: preventing marine life from entering the system, handling the Caspian's fluctuating water levels, and ensuring continuous operation even during fierce winter storms that could freeze exposed equipment.

At peak operation, these pumps delivered over 400,000 cubic meters of seawater daily to the desalination plants. The brine discharge—concentrated salt water left after desalination—was carefully dispersed to minimize impact on local marine ecosystems.`,

  // Building: First Reactor
  'fact.first-reactor.title': 'Heart of the City',
  'fact.first-reactor.short':
    'The BN-350 used liquid sodium coolant at 500°C—hot enough to glow orange in the dark.',
  'fact.first-reactor.full': `The BN-350 was an engineering marvel of its time. Its core contained 369 fuel assemblies bathed in liquid sodium heated to 500°C. At this temperature, sodium glows with a faint orange light, earning fast breeder reactors the nickname "liquid sunshine."

Why sodium? Unlike water, it doesn't slow neutrons, allowing the "fast" breeding process. It also has excellent heat transfer properties and doesn't corrode steel at high temperatures. The drawback: sodium burns violently in air and explodes on contact with water, requiring extraordinary safety measures.

The reactor's thermal output of 1,000 MW was split between two purposes: half drove turbines generating 150 MW of electricity, while the other half provided steam for the desalination plants. This dual-purpose design made the BN-350 unique in nuclear history.`,

  // Building: First Distiller
  'fact.first-distiller.title': 'The Flash Chambers',
  'fact.first-distiller.short':
    'In each distillation stage, seawater "flashed" into steam as pressure dropped—no boiling required.',
  'fact.first-distiller.full': `Aktau's desalination plants contained rows of massive steel chambers, each operating at slightly lower pressure than the last. Hot seawater entering each chamber would instantly "flash" into steam, even at temperatures below 100°C, because of the reduced pressure.

This multi-stage flash (MSF) process was remarkably efficient. By using 40 or more stages, engineers could extract fresh water while keeping the temperature drop per stage to just 2-3°C. The waste heat from the reactor—normally discarded—became the system's power source.

The plants ran continuously for decades, producing water that met strict Soviet drinking standards. Operators monitored hundreds of valves, pumps, and sensors to keep the delicate balance of temperature and pressure across all stages.`,

  // Building: First Housing
  'fact.first-housing.title': 'Soviet Microrayons',
  'fact.first-housing.short':
    "Aktau's apartment blocks, called microrayons, were designed to house entire neighborhoods as self-contained units.",
  'fact.first-housing.full': `The residential buildings of Aktau followed the Soviet "microrayon" model—self-contained neighborhood units with housing, schools, shops, and services all within walking distance. Each microrayon housed 5,000-15,000 residents.

These prefabricated concrete buildings could be assembled quickly using standardized panels. While often criticized for their uniformity, they provided modern amenities—central heating, running water, electricity—that were luxuries in much of the Soviet Union.

In Aktau, these buildings had special significance: their central heating came directly from the reactor's steam system, and their water from nuclear-powered desalination. Residents lived intimately connected to the technology that made their desert home possible.`,

  // Building: First Tank
  'fact.first-tank.title': 'Desert Water Storage',
  'fact.first-tank.short':
    "Aktau's water tanks held reserves for emergencies—vital when a single reactor supplied an entire city.",
  'fact.first-tank.full': `Water storage was critical in Aktau. If the reactor or desalination plants needed maintenance, the city had to survive on reserves. Massive storage tanks held millions of liters of desalinated water, providing a buffer against any interruption in supply.

The tanks also helped manage daily demand fluctuations. Water consumption peaked in mornings and evenings, while the desalination plants ran most efficiently at constant output. Storage allowed the plants to run steadily while meeting variable demand.

In the extreme desert climate, these tanks required special design. Insulation prevented freezing in winter (temperatures could drop to -30°C) and limited evaporation in summer. Underground tanks stayed cooler but required pumps; elevated tanks used gravity but needed more maintenance.`,

  // Building: 5 Buildings
  'fact.five-buildings.title': 'City Planning in the Desert',
  'fact.five-buildings.short':
    'Aktau was carefully planned to minimize water loss—wide streets reduced dust, parks provided cooling.',
  'fact.five-buildings.full': `Soviet planners designed Aktau with the desert climate in mind. Wide boulevards oriented to catch sea breezes provided natural cooling. Parks and tree-lined streets—all irrigated with desalinated water—created shade and reduced ambient temperatures by several degrees.

The city layout clustered residential areas near the coast where temperatures were milder, while industrial facilities sat inland. This separation protected residents from industrial emissions while keeping the reactor close to its seawater source.

Buildings were oriented to minimize sun exposure on their longest walls. Light-colored facades reflected heat, and deep balconies provided shade. These passive cooling strategies reduced the enormous energy demand that would otherwise be needed for air conditioning.`,

  // Building: 10 Buildings
  'fact.ten-buildings.title': 'Soviet Nuclear Achievement',
  'fact.ten-buildings.short':
    'The BN-350 operated for 26 years with no major incidents—a remarkable safety record for early fast breeder technology.',
  'fact.ten-buildings.full': `The BN-350's safety record was exceptional. Over 26 years of operation, it never experienced a major accident—remarkable for pioneering technology. Several sodium leaks occurred, but containment systems prevented any release of radioactivity.

This success required constant vigilance. Soviet nuclear workers were highly trained, and the closed-city status meant authorities could carefully select who lived and worked there. Operators underwent years of training before being allowed to control the reactor.

The reactor's design included multiple safety systems: neutron-absorbing control rods that could shut down the chain reaction in seconds, backup cooling systems, and containment structures designed to survive any credible accident. These features informed the design of later fast breeder reactors worldwide.`,

  // Milestone: Population 200
  'fact.population-200.title': 'Growing the Desert City',
  'fact.population-200.short':
    'New residents arrived by train across hundreds of kilometers of empty steppe to build their future in Aktau.',
  'fact.population-200.full': `Workers came to Aktau from across the Soviet Union, drawn by good salaries, modern housing, and the excitement of pioneering a new city. The journey itself was an adventure—a long train ride across the empty Kazakh steppe, ending at a city that appeared like a mirage on the desert shore.

New arrivals found a surprisingly cosmopolitan community. Russians, Kazakhs, Ukrainians, and dozens of other nationalities lived and worked together. The shared challenge of desert life created strong bonds, and many families stayed for generations.

The city offered amenities rare in Soviet Central Asia: reliable electricity and water, good schools, a university, theaters, and sports facilities. For many, Aktau represented the Soviet promise of modernity—a future built on science and technology.`,

  // Milestone: Population 500
  'fact.population-500.title': 'Aktau at Its Peak',
  'fact.population-500.short':
    'By the 1980s, Aktau was one of the most modern cities in Central Asia—all powered by a single reactor.',
  'fact.population-500.full': `At its zenith in the 1980s, Aktau represented the height of Soviet techno-optimism. A city of over 100,000 people thrived in one of Earth's most inhospitable environments, sustained entirely by nuclear technology.

The city boasted amenities that were rare even in Soviet capitals: reliable hot water year-round, consistent electricity, tree-lined boulevards, and green parks in the middle of the desert. The BN-350 made it all possible, its humming generators the heartbeat of urban life.

This achievement came at enormous cost. The reactor, desalination plants, and city infrastructure represented billions of rubles of investment. Only the Soviet state's ability to mobilize resources without regard for economic return could have built such a city. It was a triumph of central planning—and perhaps its most ambitious monument.`,

  // Milestone: Survive Winter
  'fact.survive-winter.title': 'Winter in the Desert',
  'fact.survive-winter.short':
    "Aktau's winters could drop to -30°C. District heating from the reactor kept 150,000 people warm.",
  'fact.survive-winter.full': `The Mangyshlak Peninsula experiences extreme continental climate—scorching summers and bitter winters. Temperatures can swing from +45°C in July to -30°C in January, with fierce winds that make it feel even colder.

Surviving winter required massive amounts of heat. The BN-350's steam system didn't just produce electricity and fresh water—it also fed a district heating network that warmed every building in the city. Hot water pipes ran beneath streets and into every apartment block.

If the reactor shut down in winter, the city would freeze within hours. This single point of failure drove engineers to build redundancy into every system. Backup boilers, stored fuel, and emergency procedures were constantly maintained against the day they might be needed.`,

  // Milestone: Reactor Warning
  'fact.reactor-warning.title': 'BN-350 Safety Systems',
  'fact.reactor-warning.short':
    'When temperatures rose, operators had seconds to respond. Multiple safety systems could shut down the reactor automatically.',
  'fact.reactor-warning.full': `Fast breeder reactors operate with tighter margins than conventional nuclear plants. The BN-350's liquid sodium coolant could not be allowed to boil, and core temperatures had to stay within precise limits to prevent fuel damage.

When sensors detected abnormal conditions, automatic systems could insert control rods within seconds, stopping the chain reaction. Additional neutron-absorbing balls could drop into the core by gravity alone, providing shutdown capability even if all power was lost.

The operators' control room displayed thousands of parameters on massive panels. Alarms would sound at the first sign of trouble, and strict procedures dictated exactly how to respond to each scenario. This discipline was essential—in a fast breeder, there's no time for improvisation.`
} as const;

export type TranslationKey = keyof typeof en;
