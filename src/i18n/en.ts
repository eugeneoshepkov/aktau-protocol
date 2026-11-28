/**
 * English translations for Aktau Protocol
 */
export const en = {
  // ============================================
  // HUD (Header)
  // ============================================
  'hud.day': 'DAY',
  'hud.pop': 'Residents',
  'hud.water': 'Water',
  'hud.sea': 'Seawater',
  'hud.heat': 'Heat',
  'hud.power': 'Power',
  'hud.temp': "Core strain",
  'hud.mood': 'Morale',
  'hud.status': 'City status',
  'hud.lowFreshWater': 'Drinking water is low. Check the desalination plants supplying homes.',
  'hud.waterRepair': 'Water shortage',
  'hud.waterRepairPaused': 'Water shortage · Build while paused',
  'hud.waterRepairDays': 'Repair days left · {days}',
  'hud.waterRepairIdle': 'An idle desalination plant needs water from a sea pump and heat from a nearby plant.',
  'hud.waterRepairExpand': 'For a new supply line, build a sea pump and a desalination plant within reach of heat.',
  'hud.waterResume': 'Resume',
  'hud.lowSeawater': 'Seawater is low. Check the sea pumps feeding the desalination plants.',
  'hud.lowHeat': 'Heat is low. A thermal plant can top up the heat supply.',
  'hud.lowPower': 'Power is low. Save electricity for the pumps before building again.',
  'hud.lowMorale': 'Morale is low. Connect homes to drinking water and heat.',
  'hud.highStrain': 'Reactor strain is high. Connect another desalination plant to cool it.',
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
  'hud.tooltip.population': 'City population. Grows when happy and resources are stable. Larger populations consume more per person. Fleeing citizens = game over.',
  'hud.tooltip.freshWater': 'Fresh drinking water. Produced by desalination plants. Consumed by housing.',
  'hud.tooltip.seawater': 'Sea pumps draw water from the Caspian for the desalination plants.',
  'hud.tooltip.heat': 'The reactor and thermal plants heat homes and run desalination. Demand doubles in the first winter.',
  'hud.tooltip.electricity': 'The reactor and thermal plants supply power for pumping, upkeep and construction.',
  'hud.tooltip.temp': 'Strain rises by 1 each day. Each working desalination plant offsets 0.8. At 100% the reactor fails.',
  'hud.tooltip.happiness': 'Morale rises when homes have water and heat. At zero, the district revolts.',

  // Seasons
  'season.spring': 'Spring (Heat ×{mult})',
  'season.summer': 'Summer (Heat ×{mult})',
  'season.autumn': 'Autumn (Heat ×{mult})',
  'season.winter': 'Winter (Heat ×{mult})',

  // Events
  'event.sandstorm.name': 'Sandstorm',
  'event.sandstorm.desc': 'Desert winds reduce pump efficiency by 50%',
  'event.cold_snap.name': 'Cold Snap',
  'event.cold_snap.desc': 'Sudden temperature drop increases heat consumption by 50%',
  'event.equipment_failure.name': 'Equipment Failure',
  'event.equipment_failure.desc': 'Electrical systems damaged, power output reduced by 30%',
  'event.population_surge.name': 'Population Surge',
  'event.population_surge.desc': 'New workers arrive, happiness bonus +10',
  'event.blizzard.name': 'Blizzard',
  'event.blizzard.desc': 'Severe winter storm doubles heat consumption',
  'event.arctic_front.name': 'Arctic Front',
  'event.arctic_front.desc': 'Polar air mass increases heat consumption by 80%',
  'event.pipe_freeze.name': 'Pipe Freeze',
  'event.pipe_freeze.desc': 'Water pipes frozen, fresh water production halved',
  'event.heat_wave.name': 'Heat Wave',
  'event.heat_wave.desc': 'Extreme temperatures reduce electricity production by 30%',
  'event.algae_bloom.name': 'Algae Bloom',
  'event.algae_bloom.desc': 'Algae clogs the intakes. Pumps deliver 60% of normal output.',
  'event.reactor_scram.name': 'Reactor SCRAM',
  'event.reactor_scram.desc': "Core strain rises 15 points and power output falls by half.",
  'event.water_contamination.name': 'Water Contamination',
  'event.water_contamination.desc': 'Contamination detected! 30% freshwater lost, production halved',
  'event.favorable_winds.name': 'Favorable Winds',
  'event.favorable_winds.desc': 'Good conditions boost pump efficiency by 20%',

  // Game Over
  'gameover.title': 'Game over',
  'gameover.location': 'Shevchenko · Caspian Sea',
  'gameover.day': 'Day {day}',
  'gameover.nextTime': 'Next time',
  'gameover.meltdown': 'The evacuation',
  'gameover.drought': 'When the taps ran dry',
  'gameover.freeze': 'The heating went out',
  'gameover.extinction': 'The last train',
  'gameover.revolt': 'The town takes to the square',
  'gameover.restart': 'Return to title',
  'gameover.art.drought': 'A woman with a blue pail stands at a dry fountain between the flats and the Caspian.',
  'gameover.art.freeze': 'Through a frost-rimmed kitchen window, a few flats glow across a snowy street.',
  'gameover.art.meltdown': 'Families board a cream and red shift bus at dusk, the power station on the horizon.',
  'gameover.art.extinction': 'A lone traveller holds a suitcase on the platform beside a green passenger train.',
  'gameover.art.revolt': 'Workers in blue overalls gather on the steps of the Palace of Culture to hear a woman speak.',
  'gameover.story.meltdown':
    'When the BN-350 reactor overheated, the shift buses pulled up outside the school. Neighbours lifted bags onto their laps to make room for the children.',
  'gameover.story.drought':
    'By noon the queue at the standpipe had gone. A woman stopped at the fountain with her blue enamel pail. There was only dust in the basin.',
  'gameover.story.freeze':
    'By morning the mittens on the kitchen radiator were still damp. Frost had crept so far across the window that you could barely see the block opposite.',
  'gameover.story.extinction':
    'One passenger waited at Mangyshlak station, suitcase in hand. In his coat pocket he could still feel the key to his flat in the First Microrayon.',
  'gameover.story.revolt':
    'The workers came straight from their shift to the square outside the Palace of Culture. They wanted to know when their homes would have water and heat again.',
  'gameover.tip.meltdown': 'Connect a second desalination plant to a seawater intake and a heat source to bring reactor strain down.',
  'gameover.tip.drought': 'Before adding more housing, check that your desalination plants have both seawater and heat.',
  'gameover.tip.freeze': 'Build a thermal plant while you still have heat in reserve.',
  'gameover.tip.extinction': 'Keep fresh water at 15 or more and morale at 40 or more to keep residents from leaving.',
  'gameover.tip.revolt': 'Use the pipe map to find homes missing drinking water or heat and reconnect them.',

  // ============================================
  // Build Panel
  // ============================================
  'build.open': 'Build',
  'build.cancel': 'Cancel',
  'build.preview.confirm': 'Build here',
  'build.preview.suggested': '{building} · Suggested lot',
  'build.preview.compare': 'Tap another tile to compare.',
  'build.preview.noLot': 'No connected lot available.',
  'build.preview.invalid': 'You can’t build on this tile.',
  'build.preview.freshWater': 'Fresh water connected',
  'build.preview.noFreshWater': 'Fresh water missing',
  'build.preview.seawater': 'Seawater connected',
  'build.preview.noSeawater': 'Seawater missing',
  'build.preview.heat': 'Heat connected',
  'build.preview.noHeat': 'Heat missing',
  'build.preview.pumpReach': 'Nearby buildings can receive seawater.',
  'build.preview.pumpIsolated': 'No buildings in reach of this pump.',
  'build.preview.heatReach': 'Nearby buildings can receive heat.',
  'build.preview.heatIsolated': 'No buildings in heating range.',
  'build.preview.tankLinked': 'A water line reaches this tank.',
  'build.preview.tankIsolated': 'No water line reaches this tank.',
  'build.needsSeawaterHeat': 'Needs seawater and heat',
  'build.needsFreshWaterHeat': 'Needs fresh water and heat',
  'build.needsWaterLine': 'Needs a water line',
  'chronicle.short': 'Chronicle',
  'hud.statusShort': 'City',
  'hud.issues': 'Needs attention',
  'hud.urgent': 'Needs attention now',
  'hud.showOnMap': 'Show on map',
  'hud.speed': 'Game speed',
  'build.title': 'Construction',
  'build.free': 'Free',
  'build.maxed': "At limit",
  'build.demolish': "Demolish",
  'build.demolish.desc': 'Click a building to demolish it and recover 50% of its cost.',
  'build.demolish.refund': 'Refund: {amount}',
  'build.demolish.confirm': 'Demolished {building}',
  'build.demolish.reactor': 'Cannot demolish the reactor!',

  // Building Names
  'building.pump.name': 'Water Pump',
  'building.pump.desc': "Draws seawater. Place in shallow water within two tiles of shore.",
  'building.reactor.name': 'BN-350 Reactor',
  'building.reactor.desc': "Supplies heat and power to the city. Working desalination plants keep core strain under control.",
  'building.distiller.name': 'Desalination Plant',
  'building.distiller.desc': "Turns seawater into drinking water. Needs a seawater intake and a heat connection.",
  'building.microrayon.name': 'Microrayon Housing',
  'building.microrayon.desc':
    'Soviet-style housing block. Consumes water and heat, generates happiness. Build on SAND tiles.',
  'building.water_tank.name': 'Water Tank',
  'building.water_tank.desc': "Relays water from a working supply line to nearby housing.",
  'building.thermal_plant.name': 'Thermal Plant',
  'building.thermal_plant.desc':
    'Fossil fuel power plant. Provides electricity and heat, but less than the reactor.',

  // ============================================
  // Intro Screen (keep title in English)
  // ============================================
  'map.network': 'Pipe network',
  'walk.label': "Growing up here",
  'walk.routes': "Choose a route",
  'walk.source': "Read the recollection",
  'walk.landscapeSource': "See the valley",
  'walk.start': "Walk through Shevchenko",
  'walk.iceCream.invite': "Join the ice-cream queue",
  'walk.swimmingPier.invite': "Go swimming at the pier",
  'walk.torysh.invite': "Take a day trip to Torysh",
  'walk.chaika.invite': "Catch a film at Chaika",
  'sight.iceCream.name': "Twenty kopecks for a plombir",
  'sight.iceCream.description': "Twenty kopecks bought a waffle cup of plombir from the local dairy. The kids cashed in empty bottles for a trip to the café, where the same ice cream came in a metal dish with raspberry jam.",
  'sight.swimmingPier.name': "The First Microrayon pier",
  'sight.swimmingPier.description': "The city’s first beach was by the yacht club in the First Microrayon. There were rides and playgrounds on shore. When it was time for a swim, you could climb down from a wooden pier into the Caspian.",
  'sight.torysh.name': "Torysh, the Valley of Stone Balls",
  'sight.torysh.description': "A day trip out of town takes you into the open Mangystau steppe. At Torysh, round stones sit half buried on the slopes. Where one has split, you can see the layers inside.",
  'sight.chaika.name': "A backwards film at Chaika",
  'sight.chaika.description': "In winter the kids ducked into Chaika, the courtyard club in the Eleventh Microrayon, to warm up. There was just one reel, Operation Y. Run it backwards and the scattered pots on screen jump back into line.",
  'album.count': "Keepsakes · {count}/4",
  'album.iceCream.take': "Who’s last in line?",
  'album.iceCream.queue': "Behind me. There’s one more person at the window.",
  'album.iceCream.serve': "My turn · take a plombir",
  'album.swimmingPier.take': "Go for a swim",
  'album.torysh.take': "Hike out and sketch the stones",
  'album.chaika.take': "Run the film backwards",
  'album.iceCream.item': "A sleeve from a waffle cup",
  'album.swimmingPier.item': "A postcard from the pier",
  'album.torysh.item': "A pencil sketch of Torysh",
  'album.chaika.item': "A strip of film from Chaika",
  'album.swimmingPier.wait': "Come back for a swim in summer. Summer starts on day {day}.",
  'album.torysh.wait': "The autumn hike leaves on day {day}.",
  'album.chaika.wait': "The winter screening starts on day {day}.",
  'album.chaika.replay': "Rewind again",
  'album.chaika.scene': "The scattered pots jump back onto the shelf.",
  'album.iceCream.result': "Your turn at the window. The waffle cup is cold through its paper sleeve.",
  'album.swimmingPier.result': "Down the ladder and into the Caspian. From the water you can see the gaps between the planks.",
  'album.torysh.result': "You sit beside the split stone and sketch its rings before the walk back.",
  'album.note.open': "Write on the back",
  'album.note.close': "Turn it over",
  'album.note.label': "My memory",
  'album.note.local': "Saved only in this browser.",
  'album.note.unsaved': "Browser storage is unavailable. This memory will last until this page closes.",
  'press.summary': "From the local papers · water and power",
  'press.early': "In January 1967, a Pravda correspondent recalled the queues for water beside the barracks a few years earlier. On this visit to Shevchenko, people were queuing to see a film.",
  'press.water': "On 29 May 2021, Lada.kz published footage from Microrayon 32V. The taps had run dry, and residents were still queuing at a water tanker late at night.",
  'press.power': "On 3 July 2023, a thermal generating unit at MAEK went offline. The grid operator recorded power cuts across Mangystau and Atyrau. By then BN-350 had been shut down for more than two decades.",
  'press.earlyLink': "Pravda, 1967",
  'press.waterLink': "Lada.kz, 2021",
  'press.powerLink': "KEGOC, 2023",
  'press.waterInvite': 'Why the neighbourhood queued for water',
  'press.reactorSummary': 'Plant archive · February 1975',
  'press.reactor': 'The BN-350 operating record lists two steam-generator faults in late 1973. A further leak in February 1975 caused a fire that lasted about two hours.',
  'press.reactorLink': 'Read the operating history',
  'sight.short': 'Sights',
  'sight.open': 'City sights',
  'sight.close': 'Return to the city',
  'sight.prev': 'Previous sight',
  'sight.next': 'Next sight',
  'sight.source': 'Historical source',
  'sight.lighthouse.name': 'Melovoy Lighthouse',
  'sight.lighthouse.description': 'In 1974 an octagonal beacon was installed on the roof of an apartment block overlooking Cape Melovoy.',
  'sight.abayPalace.name': 'Abay Palace of Culture',
  'sight.abayPalace.description': 'At their old club, the Altair dancers practised holding on to the backs of chairs. When the palace opened in the fourth microdistrict in 1974, they had a studio with mirrors and ballet barres. By the 1980s, five-year-olds were taking their first dance lessons here too.',
  'sight.monument.name': 'Taras Shevchenko monument',
  'sight.monument.description': 'The monument to the Ukrainian poet opened in 1982 in the square between the fourth and fifth microdistricts.',
  'sight.factory.name': 'PGMK fertiliser works',
  'sight.factory.description': 'At the Caspian mining and metallurgical combine, the ammonia shop had a long concrete frontage with a steel tower rising behind it.',
  'sight.reactor.name': 'BN-350 power station',
  'sight.reactor.description': 'At the Mangyshlak energy complex, the BN-350 reactor supplied both electricity and steam for desalination.',
  'sight.distiller.name': 'MAEK desalination works',
  'sight.distiller.description': 'Rows of distillation units turned Caspian seawater into fresh water for Shevchenko and its industries.',
  'map.served': 'Housing blocks served',
  'calendar.spring': 'Spring',
  'calendar.summer': 'Summer',
  'calendar.autumn': 'Autumn',
  'calendar.winter': 'Winter',
  'calendar.next': '{season} begins on day {day}',
  'sight.fieldTower.name': "Melovoye field tower",
  'sight.fieldTower.description': "The Melovoye field crew called these towers on runners “robots.” Figure 7 in the study shows the machines out on the field site.",
  'sight.fieldTrace.name': "The old field plot",
  'sight.fieldTrace.description': "A pipe hangs over a shallow hollow. The ground settled more than a year after the field team left this plot. Figure 6 in the Melovoye study shows the gap beneath the pipe.",
  'field.stage': "Melovoye",
  'field.invitation': "The spring bus from the research institute is due. Host the Melovoye team for an optional field season, or keep building the waterfront.",
  'field.nextSpring': "The waterfront is yours to develop. The Melovoye field team can visit when spring returns on day {day}.",
  'field.host': "Host the field team",
  'field.housing.title': "Rooms for the field team",
  'field.housing.desc': "One of the Melovoye researchers stayed in the Second Microrayon during field season. Connect a sixth apartment block to water and heat so the visiting crew has a place to stay.",
  'field.shift.title': "The night shift calls",
  'field.shift.desc': "Melovoye worked three shifts. In this scenario, sending your crew finishes the trial in 10 days and leaves the city without emergency shifts until then. The field team can finish alone in 20 days.",
  'field.send': "Send the reserve crew · 10 days",
  'field.keep': "Keep the crew in town · 20-day trial",
  'field.trial.title': "Field trial under way",
  'field.trial.sent': "The reserve crew took the bus inland. The trial ends and the crew returns on day {day}.",
  'field.trial.kept': "The visiting team is covering its own shifts. The trial ends on day {day}.",
  'field.tower.title': "The field tower is ready",
  'field.tower.desc': "Visit the tower the team nicknamed a robot. The team plans to revisit the old plot on day {day}.",
  'field.visitTower': "Visit the field tower",
  'field.return.title': "A year at the old plot",
  'field.return.desc': "A stretch of pipe now hangs above a dip in the steppe where the field crew worked. Look back at what changed.",
  'field.visitTrace': "Revisit the field plot",

  'menu.genre': "City-building survival game",
  'menu.premise': 'Keep the flats in Shevchenko supplied with water and heat.',
  'menu.fact.iceCream': 'Twenty kopecks bought a wafer cup of plombir ice cream from the local dairy.',
  'menu.fact.pier': 'On the city’s first beach, wooden piers stretched into the Caspian beside the yacht club.',
  'menu.fact.lighthouse': 'In 1974, a lighthouse went up on the roof of a block of flats at Cape Melovoy.',
  'menu.fact.abay': 'Before they moved into the Abay Palace of Culture, Altair’s dancers used chair backs as ballet barres.',
  'menu.fact.water': 'Steam at the power plant spun the turbines, then helped turn Caspian seawater into drinking water.',
  'menu.fact.cinema': 'At the Chaika club, kids ran Operation Y backwards to watch scattered pots jump back into place.',
  'menu.nextFact': 'Next fact',
  'menu.pauseFacts': 'Pause facts',
  'menu.resumeFacts': 'Resume facts',
  'menu.start': "Start game",
  'menu.continue': "Continue city",
  'menu.new': "New city",
  'menu.guide': "Field manual",
  'menu.close': "Close",
  'menu.loading': "Opening district…",
  'menu.saveUnavailable': 'Could not open the save. A fresh district is ready.',
  'menu.retry': "Reload game",
  'menu.loadFailed': "The 3D district could not start. Check that WebGL is enabled, then reload.",
  'menu.soundOn': "Sound on",
  'menu.soundOff': "Sound off",
  'menu.playSound': "Play sound",
  'menu.place': 'Shevchenko, Kazakh SSR',
  'menu.era': '1980s',
  'guide.water': "Bring the sea inland",
  'guide.water.info': "A pump draws seawater. A desalination plant needs both a nearby pump and heat from a reactor or thermal plant to produce drinking water.",
  'guide.housing': "Settle the waterfront",
  'guide.housing.info': "Choose housing from the construction menu and place it within reach of water and heat. The marked plot offers a connected site for your current order.",
  'guide.winter': "Plan for winter",
  'guide.winter.info': "Winter doubles heat demand. Complete district orders to earn supplies and use the pause control whenever you need time to plan.",
  'guide.controls': "Drag to pan. Scroll or pinch to zoom. Use Q and E to rotate.",
  'guide.touchControls': 'Drag with one finger to move around the city. Pinch to zoom or twist two fingers to rotate.',
  'hud.options': "City controls",
  'hud.pause': "Pause or resume",
  'build.site.pump': "Sea pump · Place in water within two tiles of shore",
  'build.site.distiller': "Desalination · Place near a pump and a heat source",
  'build.site.microrayon': "Housing · Place on sand within reach of water and heat",
  'build.site.water_tank': "Water tank · Extend a working water line",
  'build.site.thermal_plant': "Thermal plant · Supply heat to nearby buildings",
  'build.site.demolish': "Demolish · Choose a building for a 50% base-cost refund",
  'build.pump': "Sea pump",
  'build.distiller': "Desalination",
  'build.microrayon': "Housing",
  'build.water_tank': "Water tank",
  'build.thermal_plant': "Thermal plant",
  'intro.mute': 'Toggle music',
  'intro.language': 'Switch language',

  // ============================================
  // Tutorial / Mission Panel
  // ============================================

  'plan.dispatch': 'Emergency shift · {cost} power',
  'plan.nextDispatch': 'Next shift available on day {day}',
  'plan.dispatchHelp': 'Run emergency pumps or boilers. Crews return in 10 days.',
  'plan.label': 'District plan',
  'plan.homes.title': 'House the next shift',
  'plan.homes.desc': 'Tap the marked lot to connect a second housing block to water and heat.',
  'plan.intake.title': 'Expand the seawater intake',
  'plan.intake.desc': 'Build a second pump in the shallows. One pump feeds one desalination plant.',
  'plan.water.title': 'Commission the second line',
  'plan.water.desc': 'A second desalination plant needs a pump and a heat source within five tiles.',
  'plan.district.title': 'Finish the waterfront district',
  'plan.district.desc': 'Bring four housing blocks online. Keep each close to fresh water and heat.',
  'plan.residents.title': 'Welcome 180 residents',
  'plan.residents.desc': 'Keep water above 20 and morale above 60 so families move into the empty homes.',
  'plan.winter.title': 'See the first winter through',
  'plan.winter.desc': 'Reach spring on day 121. Winter doubles heat demand. Watch the reserves.',
  'plan.complete.title': 'District charter signed',
  'plan.complete.desc': 'The city can commission one public work. Choose a service for the waterfront.',
  'plan.fifth.title': 'Open the fifth block',
  'plan.fifth.desc': 'Connect a fifth housing block to fresh water and heat to make room for 250 residents.',
  'plan.settle.title': 'Settle the waterfront',
  'plan.settle.desc': 'Welcome 250 residents. Keep water above 20 and morale above 60 to fill the new homes.',
  'plan.established.title': 'Waterfront district complete',
  'plan.established.desc': 'Five blocks have housed 250 residents. The waterfront is yours to develop.',
  'civic.stage': 'Civic works',
  'civic.public_garden.name': 'Waterfront reed garden',
  'civic.public_garden.benefit': '{percent}% less household water use',
  'civic.district_heating.name': 'District heating works',
  'civic.district_heating.benefit': '{percent}% less city heat demand',
  'civic.cost.heat': '{power} power + {amount} heat',
  'civic.cost.freshWater': '{power} power + {amount} water',
  'civic.opened': '{project} commissioned',
  'civic.noSite': 'Clear a parcel with one tile of space around it.',
  'plan.reward.population': '+{amount} residents',
  'plan.reward.electricity': '+{amount} power',
  'plan.reward.freshWater': '+{amount} water',
  'plan.count.microrayon': '{count}/{target} blocks',
  'plan.count.pump': '{count}/{target} pumps',
  'plan.count.distiller': '{count}/{target} plants',
  'plan.count.population': '{count}/{target} residents',
  'plan.count.day': 'Day {count}/{target}',
  'plan.showLot': 'Show lot',
  'plan.build.microrayon': 'Build housing',
  'plan.build.pump': 'Build pump',
  'plan.build.distiller': 'Build desalination plant',


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
  'tooltip.temp': "Core strain {temp}%",
  'tooltip.cooling': "Relieves 0.8 points of core strain per day",
  'tooltip.needs': 'Needs: {missing}',
  'tooltip.noWater': 'No water supply - residents unhappy!',
  'tooltip.noHeat': 'No heat supply - residents unhappy!',
  'tooltip.noConnection': 'Not connected - residents unhappy!',
  'tooltip.disconnected': 'Not connected to network',
  'tooltip.heatSource': 'Heat Source',
  'tooltip.waterSource': 'Water Source',
  'tooltip.receiving': '← Receiving: {sources}',
  'tooltip.sending': '→ Sending: {targets}',

  // ============================================
  // Chronicle
  // ============================================
  'chronicle.button': 'The Shevchenko Chronicle (J)',
  'chronicle.learnMore': 'Learn more...',
  'chronicle.wikiLink': 'Read more on Wikipedia',
  'chronicle.paper': 'Read the Melovoye paper',
  'chronicle.slip': 'Field report · game illustration',
  'chronicle.material': 'Material',
  'chronicle.metal': 'Metal',
  'chronicle.backToArchive': 'Back to Chronicle',
  'chronicle.archiveTitle': 'The Shevchenko Chronicle',
  'chronicle.discovered': 'Collected {count} of {total}',
  'chronicle.new': 'Unread',
  'chronicle.illustration': 'Illustration for the game',
  'chronicle.options': 'Album options',
  'chronicle.confirmReset': 'Clear all the stories collected in this browser? Your city will stay as it is.',
  'chronicle.clue.home': 'Connect a second block to water and heat to find the new family’s postcard.',
  'chronicle.clue.pump': 'Place a pump in the shallows to discover how the city drew water from the Caspian.',
  'chronicle.clue.distiller': 'Build a desalination plant to discover how seawater reached the kitchen tap.',
  'chronicle.clue.tank': 'Build a water tank to discover where the city kept its drinking water.',
  'chronicle.clue.day': 'On day {day}, look for “{title}” in the Chronicle.',
  'chronicle.clue.residents': 'Make room for {count} residents to discover another city story.',
  'chronicle.clue.winter': 'Keep the district warm through the first few days of winter to discover a seasonal story.',
  'chronicle.reset': 'Reset Discoveries',

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
  'feedback.nearShore': 'Choose water within two tiles of the shore.',
  'feedback.leaveSpace': 'Leave more room between buildings.',
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
  'diagnostic.runningLow.heat': 'At this rate the heat reserve will last at most two days. A thermal plant can replenish it.',
  'diagnostic.runningLow.freshWater': 'At this rate drinking water will last at most two days. Check the seawater and heat supply to the desalination plants.',
  'diagnostic.reactorCooling': 'Reactor strain is high but falling. Keep the desalination plants connected.',
  'diagnostic.distiller.water': 'A desalination plant needs seawater from a sea pump.',
  'diagnostic.distiller.heat': 'A desalination plant needs heat from the reactor or a thermal plant.',
  'diagnostic.distiller.both': 'A desalination plant needs both seawater and heat.',
  'diagnostic.microrayon.water': 'Housing needs drinking water from a desalination plant.',
  'diagnostic.microrayon.heat': 'Housing needs heat from the reactor or a thermal plant.',
  'diagnostic.microrayon.both': 'Housing needs both drinking water and heat.',

  // ============================================
  // Shortcuts Modal
  // ============================================
  'shortcuts.title': 'Keyboard Shortcuts',
  'shortcuts.touchTitle': 'Touch controls',
  'shortcuts.touchExplore': 'Explore the city',
  'shortcuts.touchInspect': 'Tap a building or landmark to see what’s there.',
  'shortcuts.touchBuild': 'Choose a building or tap the marked lot to see its pipe connections. Tap other tiles to compare, then tap Build here.',
  'shortcuts.camera': 'Camera',
  'shortcuts.building': 'Building',
  'shortcuts.general': 'General',
  'shortcuts.pan': 'Pan camera',
  'shortcuts.panDrag': 'Pan camera (drag-style)',
  'shortcuts.rotate': 'Rotate camera',
  'shortcuts.zoom': 'Zoom in/out',
  'shortcuts.drag': 'Drag',
  'shortcuts.panMouse': 'Pan camera (mouse)',
  'shortcuts.center': 'Center map',
  'shortcuts.reset': 'Reset view',
  'shortcuts.cancel': 'Cancel placement',
  'shortcuts.show': 'Show shortcuts',
  'shortcuts.chronicle': 'The Shevchenko Chronicle',
  'shortcuts.pause': 'Pause/Resume',
  'shortcuts.mute': 'Mute/Unmute music',
  'shortcuts.close': 'Press <kbd>Esc</kbd> to close',

  // ============================================
  // Historical Facts
  // ============================================
  // Chronicle illustrations
  'fact.welcome-aktau.imageAlt': "Two newcomers look across the chalk coast toward the first apartment blocks.",
  'fact.first-housing.imageAlt': "Two children write a postcard at the kitchen table of their new flat.",
  'fact.closed-city.imageAlt': "A folder, notebook and pencil on a field trailer desk overlooking the steppe.",
  'fact.five-buildings.imageAlt': "A shaded walkway runs between pale apartment blocks with deep balconies.",
  'fact.mangyshlak-peninsula.imageAlt': "A herder and camels cross the dry steppe below pale limestone cliffs.",
  'fact.bn350-intro.imageAlt': "A worker passes the long industrial hall near the Caspian coast.",
  'fact.desalination-tech.imageAlt': "A waterworks technician draws a clear sample into a glass beaker.",
  'fact.peak-population.imageAlt': "Residents with shopping bags wait for a red-and-cream bus beside the apartment blocks.",
  'fact.caspian-sea.imageAlt': "Waves break over low chalk ledges where a lone angler faces the open Caspian.",
  'fact.shutdown.imageAlt': "An older shift worker pauses at the quiet entrance of the power station.",
  'fact.first-pump.imageAlt': "A worker looks down from the Caspian pumping pier to the water below.",
  'fact.first-reactor.imageAlt': "A cyclist rides home past the power station toward the lights of the microrayon.",
  'fact.first-distiller.imageAlt': "A worker stands on a walkway among the rows of vessels in a desalination hall.",
  'fact.first-tank.imageAlt': "Large cylindrical drinking-water tanks stand at the edge of the desert city.",
  'fact.ten-buildings.imageAlt': "Two plant employees pass a shift log across a table in the staff room.",
  'fact.population-200.imageAlt': "A family steps down from a green passenger train onto a steppe platform with their luggage.",
  'fact.population-500.imageAlt': "Residents walk by a fountain in a leafy square surrounded by apartment blocks.",
  'fact.survive-winter.imageAlt': "A child warms up beside a cast-iron radiator as snow blows across the courtyard outside.",
  'fact.reactor-warning.imageAlt': "Two shift operators look up at a signal in the power station control room.",

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

  // Day 30. Keep the discovery ID so existing players retain this entry.
  'fact.closed-city.title': 'The report said “metal”',
  'fact.closed-city.short':
    'The Melovoye field team called uranium “metal,” even in its confidential annual reports.',
  'fact.closed-city.full': `Gregory Abramov was one of the researchers who spent field seasons at Melovoye, about 20 kilometres from Shevchenko. In his letters he recalled a rule his group followed. When they spoke about uranium, they called it “metal.” They used the same word in their confidential annual reports.

Abramov also remembered Adolf Oshchepkov, who worked in the design bureau at PGMK, the local mining and metallurgical combine. He credited Oshchepkov with helping to design the group’s equipment, especially the surface control tower the crew called a robot.

In his 2020 paper about Melovoye, Abramov credits the scientists, engineers and specialists from Kazakhstan and Russia who worked on the trials.`,

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

  // The first family moves in
  'fact.first-housing.title': 'Three numbers on a postcard',
  'fact.first-housing.short': 'A family moves into your new block. The children have three numbers to learn by heart.',
  'fact.first-housing.full': `The suitcases are still in the hall. At the kitchen table, the children write Grandma a postcard with the address of their new flat.

In Shevchenko’s numbered neighbourhoods you gave the microdistrict first, then the building, then the flat. Once you knew those three numbers, you could tell a friend from school exactly where to find you.`,

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
