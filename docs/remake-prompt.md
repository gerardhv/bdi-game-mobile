# Cursor-prompt voor de BDI multiplayer webgame — versie 2

Deze prompt is gemaakt op basis van het bestaande BDI-spel en is gebruikt om de nieuwe versie te ontwikkelen.

Bouw een complete, speelbare HTML-gebaseerde remake van de educatieve BDI-game. Lever werkende code, backendconfiguratie, tests, documentatie en instructies voor hosting. Stop niet bij een ontwerp of statische mock-up. Implementeer de hieronder beschreven basisgame. De laatste sectie bevat uitsluitend mogelijke uitbreidingen en is nadrukkelijk geen implementatieopdracht.

## 1. Doel en grenzen

Vier spelers ervaren hoe informatie-uitwisseling de coördinatie van een logistieke keten beïnvloedt. Eerst spelen ze zonder BDI, met mondelinge afstemming. Daarna spelen ze dezelfde logistieke cyclus met BDI: relevante notificaties, geautoriseerde gegevensopvraging bij de bron en zichtbare ondersteuning bij bevestigingen. Beide rondes moeten succesvol speelbaar zijn. BDI laat de file niet verdwijnen en neemt de operationele keuzes van spelers niet over.

Er is één centraal scherm, door een spelleider op een beamer getoond, en vier telefoons. De overige deelnemers aan de training kijken mee zonder telefoon of spelrol. Zij moeten het hele proces en alle gemaakte keuzes zelfstandig op het centrale scherm kunnen volgen; dit is een verplicht onderdeel van de basisgame. Iedere telefoon vervult precies één rol: koper, verkoper, vervoerder of bezorger. Meerdere spelleiders moeten tegelijkertijd afzonderlijke games kunnen draaien. Spelers, gegevens, gebeurtenissen, rechten en voortgang mogen nooit tussen sessies mengen.

De game is een educatieve simulatie van BDI. Bouw geen aansluiting op echte BDI-registers, echte identiteitsmiddelen of echte logistieke organisaties. Gebruik fictieve gegevens. Noem het resultaat geen gecertificeerde of productieconforme BDI-implementatie.

## 2. Zelfstandige opdracht en verplichte spelonderdelen

Deze prompt is de volledige functionele opdracht. Je krijgt geen aanvullende bestanden of bestaande assets. Implementeer de beschreven gameplay, schermen, teksten, gegevensstromen en technische eisen op basis van dit document. Vraag niet om aanvullende referentiebestanden om te kunnen beginnen. Maak de benodigde illustraties, fictieve gegevens en korte uitlegteksten zelf.

De basisgame bevat:

- Vier rollen, één lading, twee transporttrajecten, twee chauffeurs, drie identiteitscontroles, nachtelijke overslag en een file bij de bezorger.
- Productkeuze door de koper uit camera, telefoon en televisie; bevestiging van hetzelfde product door de verkoper.
- Afzonderlijke chauffeurskeuzes door vervoerder en bezorger uit ieder drie opties.
- Een ETA van de vervoerder bij het DC van de bezorger, bevestigd door de bezorger.
- Een ETA van de bezorger bij de koper, bevestigd en doorgegeven door de verkoper.
- Een nieuwe ETA na de file, opnieuw bevestigd en doorgegeven door de verkoper.
- Opdrachten met één of drie antwoordmogelijkheden, wisselende antwoordposities en herstelbare fouten.
- In de BDI-ronde abonnementen, notificaties, automatisch ophalen van toegestane gegevens en gele markering van het bijbehorende antwoord bij bevestigingsvragen.
- Een volledig te volgen centraal trainingsscherm met de actuele opdracht, opties, ingediende keuzes, resultaat, logistieke voortgang, informatieposities per rol en informatie-uitwisseling.

De verkoper bevestigt zowel de eerste als de herziene bezorg-ETA. De koper voert de laatste chauffeurscontrole bij de aflevering uit. Houd deze taken uit elkaar.

Gebruik fictieve organisatienamen, chauffeursnamen, ordernummers en expliciete simulatiedagen. Leg technische implementatiekeuzes beknopt vast in `docs/design-decisions.md`. De eisen in deze prompt zijn leidend; de laatste sectie bevat uitsluitend ideeën buiten de implementatiescope.

## 3. Rollen, locaties en objecten

| Spelrol | Operationele verantwoordelijkheid | Eigen brongegevens | Informatie nodig van anderen |
|---|---|---|---|
| Koper | Product bestellen en lading op beveiligd terrein ontvangen | Product/order; eigen ontvangst- en controlebevestiging | Leverbelofte van verkoper; identiteit/toewijzing chauffeur bezorger |
| Verkoper | Product bevestigen, transport organiseren, lading vrijgeven, koper informeren | Orderacceptatie; vrijgave; eigen bevestiging van bezorg-ETA | Product van koper; chauffeur vervoerder; oorspronkelijke en nieuwe ETA bezorger |
| Vervoerder | Ophalen bij verkoper en vervoer naar DC bezorger | Chauffeur eerste rit; ETA DC bezorger; vertrek/aankomst eerste rit | Uitvoeringsopdracht en afhaalcontext |
| Bezorger | Lading ontvangen, overslaan en afleveren bij koper | Chauffeur tweede rit; oorspronkelijke en herziene ETA koper; tweede rit | ETA en chauffeur vervoerder; aflevercontext |

Geef iedere organisatie een vaste naam, pictogram en kleur binnen de sessie. Een deelnemer vertegenwoordigt die organisatie; de organisatie is de fictieve Association-deelnemer. Een smartphone is geen zelfstandig Association-lid.

Maak duidelijk onderscheid tussen:

- `sessionId`: technische afbakening van deze spelsessie;
- `roundId`: afzonderlijke uitvoering zonder of met BDI;
- `orderId`: handelsorder;
- `transportId`: bijbehorende transportopdracht/context;
- `legId`: eerste of tweede vervoersdeel;
- `organizationId`: koper, verkoper, vervoerder of bezorger als organisatie;
- `playerId`: de gekoppelde browsergebruiker;
- `driverId`: de fictieve chauffeur die voor een vervoersdeel gekozen is.

De game beperkt zich bewust tot één order en één transportcontext per ronde. Dat is een spelvereenvoudiging, geen BDI-aanname dat elke echte keten één universele identifier heeft. Laat order en transport expliciet naar elkaar verwijzen.

## 4. Lobby en QR-gebaseerde rolselectie

Het startscherm heeft Nieuw spel, Deelnemen en Instellingen. De spelleider maakt een sessie aan en ziet een goed leesbaar 16:9-lobbyscherm met een sessiecode en vier rolkaarten. Iedere vrije rolkaart heeft een eigen QR-code naar deze sessie en deze rol. Onder de code staan de rolnaam en een korte omschrijving.

Een speler scant de QR-code met de gewone telefooncamera. De mobiele landingspagina toont sessienaam, rol en de knop Neem deze rol. Het openen van de URL reserveert niets: linkpreviews en camerasoftware mogen geen rol claimen. Pas een expliciete aanvraag aan de server claimt de rol.

Voer die claim atomair uit. Bij twee gelijktijdige claims krijgt precies één speler de rol. De andere krijgt Deze rol is al bezet en ziet de resterende vrije rollen van dezelfde sessie. Verberg na een geslaagde claim de betreffende QR-code op het beamerscherm en toon Verbonden, de spelernaam indien ingevuld en een verbindingstatus. Een al gefotografeerde QR mag nooit alsnog dezelfde rol overnemen.

Aanvullende eisen:

- Sessienummer invoeren is een alternatief voor scannen. Toon daarna alleen de vrije rollen uit die sessie.
- Een speler kiest optioneel een korte weergavenaam; geen e-mailadres nodig.
- Een speler kan niet twee rollen in dezelfde sessie claimen.
- De hostidentiteit en beheerrechten staan nooit in de QR-code of openbare sessiecode.
- Sessies en uitnodigingen verlopen; een beëindigde sessie kan niet opnieuw worden betreden via een oude QR.
- Een refresh of korte verbindingsonderbreking behoudt de rol via de bestaande geauthenticeerde identiteit. Geef een rol niet automatisch vrij zodra een telefoon in slaapstand gaat.
- De spelleider kan een bezette rol expliciet vrijgeven of vervangen. Trek dan de oude toewijzing, uitnodiging en toegangsrechten in. Een lopende ronde wordt daarvoor gepauzeerd.
- Een nieuwe uitnodiging voor een vrijgegeven rol maakt eerdere claimlinks ongeldig.
- Start is pas beschikbaar als vier verschillende rollen bezet en gereed zijn.
- Standaard start de spelleider Zonder BDI. Een zichtbare secundaire optie Alleen BDI is beschikbaar voor demonstraties; maak dan geen fictieve vergelijking met een ontbrekende eerste ronde.
- Behoud de rolverdeling tussen de twee rondes. Een nieuwe ronde heeft wel eigen data en eigen subscriptions.

## 5. Speltoestanden en volledige cyclus

Maak een expliciete state machine met onder andere `LOBBY`, `INTRO`, `ORDER`, `SUBSCRIPTIONS`, `ORDER_CONFIRMATION`, `PLANNING`, `PICKUP`, `LINEHAUL`, `TRANSFER`, `LAST_MILE`, `DISRUPTION`, `DELIVERY`, `ROUND_REVIEW`, `COMPARISON`, `CLOSED`. Voeg de onderstaande afzonderlijke beslisstappen toe als stabiele step-ID's. Een client kan nooit zelf een stap overslaan door zijn lokale toestand te veranderen. Modelleer daarnaast de presentatieperiode na een ingediende actie als een servergestuurde substatus, zodat alle schermen dezelfde feedback tonen en de volgende actie pas na afloop wordt vrijgegeven.

| Stap | Actieve rol | Opdracht en geldige afronding | Gebeurtenis/volgend effect |
|---|---|---|---|
| S00 | Spelleider | Start ronde, toon doel en rollen. Alleen met BDI eerst de uitleg uit sectie 8. | Nieuwe ronde en schoon dossier. |
| S01 | Koper | Kies een product: camera, telefoon of televisie. Iedere keuze is geldig. | Product/order ontstaat bij koper. |
| S02 | Alle vier, alleen met BDI | Abonneer op relevante informatie over deze order. Iedere speler drukt één keer op Abonneren. | Per organisatie relevante, geautoriseerde subscriptions activeren; daarna actuele beginsituatie ophalen. |
| S03 | Verkoper | Bevestig het product van de koper uit dezelfde drie producten. | Alleen dezelfde product-ID accepteert de order; orderacceptatie wordt vastgelegd. |
| S04 | Vervoerder | Kies chauffeur eerste rit uit drie fictieve personen. Iedere keuze is geldig. | Chauffeurstoewijzing eerste rit ontstaat. |
| S05 | Bezorger | Kies chauffeur tweede rit uit drie fictieve personen. Iedere keuze is geldig. | Chauffeurstoewijzing tweede rit ontstaat. |
| S06 | Vervoerder | Kies een ETA bij DC bezorger uit drie tijden. | Verwachte aankomst eerste rit ontstaat. |
| S07 | Bezorger | Bevestig de ETA van de vervoerder uit dezelfde tijden, eventueel anders gerangschikt. | Gekozen ETA moet overeenkomen met actuele bronwaarde. |
| S08 | Bezorger | Kies een ETA bij koper uit drie tijden op de volgende dag, na de overslag. | Verwachte aankomst tweede rit, versie 1. |
| S09 | Verkoper | Bevestig deze ETA en geef de leverbelofte door aan koper. | Eigen bevestiging verwijst naar bezorg-ETA versie 1. |
| S10 | Spelmotor | Vervoerder rijdt van eigen locatie naar DC verkoper. | Aankomst bij verkoper; geen extra kennisvraag. |
| S11 | Verkoper | Bevestig de chauffeur van de vervoerder uit diens drie kandidaten. | Bij juiste identiteit/toewijzing gaat de poort open. |
| S12 | Spelmotor | Laad de goederen en laat vervoerder naar DC bezorger rijden. | De lading reist zichtbaar mee. |
| S13 | Bezorger | Bevestig de chauffeur van de vervoerder. | Tweede controle vóór overdracht. |
| S14 | Spelmotor | Toon nachtelijke overslag naar de truck van de bezorger. | Wissel vervoersdeel en simulatiedag. |
| S15 | Spelmotor | Bezorger vertrekt en komt in de vaste file terecht. | Tweede rit wordt vertraagd, oorspronkelijke ETA is niet meer betrouwbaar. |
| S16 | Bezorger | Kies een nieuwe ETA uit drie plausibele latere tijden. | Bezorgen-ETA versie 2 vervangt versie 1. |
| S17 | Verkoper | Bevestig de nieuwe ETA en informeer de koper. | Bevestiging moet naar versie 2 verwijzen. |
| S18 | Spelmotor | Bezorger rijdt verder en arriveert bij beveiligd terrein koper. | Laatste identiteitscontrole wordt actief. |
| S19 | Koper | Bevestig de chauffeur van de bezorger uit diens drie kandidaten. | Poort open, goederen ontvangen. |
| S20 | Spelmotor/spelleider | Toon succes, korte reflectie en ronde-uitkomst. | Na ronde 1 start host ronde 2; na ronde 2 vergelijking en afsluiting. |

S02 volgt pas nadat de order is aangemaakt. Rond het activeren van subscriptions mogen geen events verloren gaan: haal een geautoriseerde snapshot plus gemiste events op. Er is dus geen probleem dat de order al bestond voordat de verkoper zich abonneerde.

De autoritatieve simulator kan de procesvoortgang kennen, maar stuurt alleen een toegestane weergave naar iedere client. De gele markering in BDI verschijnt uitsluitend op basis van daadwerkelijk geautoriseerd ontvangen brongegevens, niet op basis van een uitgelekte server-answer-key.

## 6. Vragen, gegevenskeuzes en fouten

Gebruik korte Nederlandse opdrachten: Kies een product, Bevestig het product van de koper, Kies een chauffeur, Kies een ETA, Bevestig de ETA van de vervoerder, Bevestig de chauffeur van de vervoerder, Kies een nieuwe ETA en Bevestig de chauffeur van de bezorger.

Onderscheid drie soorten interacties:

1. **Nieuwe waarde kiezen.** Bij product, chauffeur en ETA is elke aangeboden optie geldig. De keuze creëert een brongegeven; er is vooraf geen goed antwoord om te verklappen.
2. **Een waarde bevestigen.** Het antwoord moet overeenkomen met een eerdere keuze van de relevante organisatie en met de vereiste versie.
3. **Een actie bevestigen.** Eén knop voor bijvoorbeeld Abonneren, Gereed of Doorgaan.

Vergelijk stabiele identifiers, nooit knopindexen, emoji, weergavenamen of afgeronde klokteksten. Randomiseer de antwoordvolgorde één keer per vraaginstantie; houd die bij refresh en herverbinden gelijk. Een hernieuwde ronde krijgt nieuwe vraaginstanties.

Bij een fout antwoord: rood accent én tekst Deze informatie komt niet overeen. Vraag het na of controleer je ontvangen gegevens. Blijf bij dezelfde vraag en laat opnieuw proberen. Registreer de fout één keer per unieke poging. Voeg geen kunstmatige tijdstraf, eliminatie of automatische keuze van het goede antwoord toe. Een technische mislukking telt niet als inhoudelijke fout.

In BDI krijgt de juiste, ontvangen waarde een gele omlijning, het label Gegevens van [organisatie] en de versie. De speler bevestigt nog steeds zelf. Wanneer een bronopvraging vertraagd is, toon Informatie wordt opgehaald; highlight pas na ontvangst. Als ophalen mislukt, toon dat en probeer opnieuw. Doe niet alsof er geverifieerde data is ontvangen.

Combineer pictogrammen altijd met begrijpelijke tekstlabels. Chauffeurs krijgen fictieve namen en goed onderscheidbare portretten. Gebruik uiterlijk of uniform niet als bewijs van autorisatie. De opdracht/toewijzing bepaalt wie verwacht wordt.

Gebruik expliciete simulatiedagen en 24-uursnotatie. Standaardconfiguratie: eerste rit dag 1 om 09:00, 12:00 of 15:00; aflevering dag 2 om 05:00, 06:00 of 08:00. Na de file worden de drie opties berekend als de gekozen oorspronkelijke bezorg-ETA plus 30, 60 en 90 minuten. Alle aangeboden nieuwe tijden moeten na de oorspronkelijke ETA en na het verstoringsmoment liggen.

## 7. Ronde zonder BDI

Spelers zien hun eigen gemaakte keuzes en een eigen notitie/dossier. Informatie van andere organisaties verschijnt niet automatisch. Bij een vraag die gegevens van iemand anders vereist, moet de speler die informatie mondeling opvragen. Geef een neutrale aanwijzing over de relevante rol, bijvoorbeeld Vraag de vervoerder welke chauffeur is ingepland. Daarmee blijft het spel toegankelijk zonder het antwoord te geven.

Synchroniseer de beurt, voortgang, verbindingen en fysieke animatie. De centrale trainingsweergave toont daarnaast alle gemaakte keuzes en antwoorden volgens sectie 13. De mobiele spelersclients ontvangen geen automatische gegevens van andere organisaties via verborgen HTML, generieke snapshots, logs, API-responses, subscriptions of browseropslag. De aparte kijkrechten van de host geven de telefoons geen extra datatoegang.

Het beamerscherm toont elke opdracht en alle reeds ingediende spelkeuzes, inclusief product, gekozen chauffeurs en exacte ETA's. Laat per organisatie apart zien welke informatie in het eigen spelsysteem beschikbaar is. Een waarde kan dus voor de zaal zichtbaar zijn terwijl de ontvangende organisatie deze in haar eigen dossier nog niet heeft. Maak dat begrijpelijk met de labels Bij de afzender bekend, Afstemming nodig en Bevestigd door ontvanger.

Het centrale scherm is bewust een didactisch totaaloverzicht. De vier spelers kunnen het eveneens zien; ga niet uit van een verborgen-informatiespel. Laat de spelleider spelers instrueren om de benodigde afstemming met hun collega-rollen uit te voeren. De app meet geen mondelinge kennisoverdracht. Zij registreert alleen expliciete acties en correcte bevestigingen. Zet het aflezen van het beamerscherm nooit automatisch om in ontvangen brondata op een telefoon. De leerervaring vergelijkt handmatige coördinatie met geautomatiseerde gegevensuitwisseling; de zaalweergave is in beide rondes aanwezig.

Behoud foutfeedback en onbeperkt opnieuw proberen. Succesvol mondeling samenwerken moet mogelijk zijn. Voeg geen opzettelijk vertraagde knoppen, misleidende antwoorden of verplichte fouten toe om BDI gunstig te laten lijken.

## 8. Ronde met BDI en correcte begrippen

Toon vóór de nieuwe order een korte, overslaanbare uitleg met drie begrijpelijke stappen: wie de organisaties zijn en aan welke afspraken ze deelnemen; wie bij dit transport betrokken is en in welke rol; hoe relevante informatie veilig bij de juiste partij terechtkomt.

Gebruik consequent onderstaande scheiding:

| Begrip | Wat het in deze game betekent | Wat je er niet van mag maken |
|---|---|---|
| BDI | Afsprakenstelsel voor beheerst, vertrouwd en geautomatiseerd data delen | Eén centrale organisatie of database die alle data bezit |
| BDI Association | Verband met onboarding en afspraken; organisaties zijn deelnemers | Een spelsessie, telefoon of willekeurig chatkanaal |
| Association Registry / Association Register | Registratie van erkende organisaties en relevante identiteits-/vertrouwensinformatie | Lijst die automatisch toegang tot ieder transport geeft |
| Orchestration Registry / Orchestration Register | Betrokken organisaties, hun transportrollen en eventuele delegaties in deze operationele context | De game-engine, centrale planner of automatisch complete choreografiedatabase |
| Authorization Registry / toegangsbeleid | Toestemmingen en voorwaarden onder zeggenschap van de Data Owner | Synoniem voor Association Registry |
| Data Owner | Partij die bepaalt wie welke gegevens mag gebruiken | Per definitie de partij die de server host |
| Data Service Provider | Dienstverlener die gegevens namens/onder verantwoordelijkheid van de Data Owner aanbiedt | Eigenaar van alle via de dienst gedeelde gegevens |
| Event | Betekenisvolle verandering, bijvoorbeeld een nieuwe ETA of bevestigde ontvangst | Iedere technische ping of animatie |
| Notificatie | Toegestaan signaal over die verandering, met context en bronverwijzing | Automatische publieke verspreiding van het hele dossier |
| Subscription | Afgesproken en geautoriseerd abonnement op relevante informatie | Onbegrensd leesrecht op alle gegevens |

Gebruik op het scherm Association Registry met de Nederlandse toelichting Associatieregister, en Orchestration Registry met de toelichting Transportrollenregister. Leg in de technische begrippenlijst vast dat deze schrijfwijzen dezelfde functie bedoelen. Gebruik niet het ambigue acroniem AR voor zowel associatie als autorisatie.

**Association-paneel:** toon de vier fictieve organisaties, hun Association-deelname en status Geregistreerd. De game gaat uit van vooraf ingerichte fictieve deelname; QR-rolselectie is geen echte onboarding. Leg met één zin uit dat lidmaatschap bijdraagt aan vertrouwen maar geen algemeen datatoegangsrecht geeft.

**Orchestration-paneel:** toon de huidige order/transportcontext en de vier organisaties met de rollen koper, verkoper, vervoerder eerste rit en bezorger tweede rit. Roltoewijzingen hebben een geldigheidsperiode en herleidbare opdrachtgever/registrerende partij. Voor het spel is de verkoper de vooraf ingestelde transportorganisator; de relatie met de koper volgt uit de order. Toon geen chauffeurkeuzes of ETA-waarden in dit registerpaneel.

**Toegang:** de gegevenshouder of diens dienst controleert identiteit, context, actieve transportbetrokkenheid, rol en het toepasselijke eigen beleid. Membership en transportrol zijn invoer voor die beslissing. Er is geen algemene BDI-regel dat elke Association-deelnemer gegevens van alle andere leden mag zien.

Autorisatie geldt afzonderlijk voor publiceren, abonneren, notificaties ontvangen en brongegevens lezen. Ook een notificatie kan gevoelige informatie onthullen. Metadata, bronlinks en topicnamen zijn daarom niet vanzelf openbaar. Controleer rechten opnieuw bij een bronopvraging en respecteer intrekking.

De fysieke chauffeurscontrole blijft een aparte spelhandeling. Een digitale organisatie-identiteit is niet automatisch bewijs dat een persoon aan de poort de juiste chauffeur is. De game vereenvoudigt de vergelijking met de geregistreerde opdracht; geen biometrie, echte legitimatie of beroepskwalificaties implementeren.

Gebruik als uitlegtekst: De bron publiceert een wijziging. Gerechtigde betrokken partijen krijgen een melding. Hun systemen halen toegestane gegevens op bij de bron. Vermijd de te centrale formulering De BDI stuurt alle data rond.

## 9. Informatiestromen en concrete toegangsmatrix

Implementeer deze matrix als expliciet **spelbeleid**. Zij ondersteunt deze gameplay en is geen universele BDI-autorisatiematrix. De matrix geldt voor de vier operationele organisaties en hun telefoondossiers. Het centrale trainingsscherm krijgt afzonderlijke kijkrechten op fictieve spelgegevens zoals beschreven in sectie 13; die rechten behoren niet tot een vijfde logistieke organisatie. Leg per resource eigenaar, uitgever, ontvangers, toegestane velden en doel vast.

| Resource of wijziging | Bronorganisatie | Toegestane ontvanger(s) in BDI | Minimale inhoud |
|---|---|---|---|
| Order/product | Koper | Verkoper | Order-ID, product-ID, hoeveelheid als vaste spelwaarde |
| Orderacceptatie | Verkoper | Koper | Geaccepteerde order en product |
| Uitvoeringscontext | Verkoper | Vervoerder en bezorger | Transport-ID, eigen taak, relevante locaties; geen volledig handelsdossier |
| Chauffeur eerste rit | Vervoerder | Verkoper en bezorger | Driver-ID/naam/avatar, organisatie, leg-ID en opdrachtcontext |
| Chauffeur tweede rit | Bezorger | Koper | Driver-ID/naam/avatar, organisatie, leg-ID en opdrachtcontext |
| ETA DC bezorger | Vervoerder | Bezorger | ETA, bestemming, leg-ID, versie |
| Bevestiging ETA eerste rit | Bezorger | Vervoerder | Verwijzing naar bevestigde versie |
| Eerste ETA bij koper | Bezorger | Verkoper | ETA, bestemming, tweede leg, versie 1 |
| Leverbelofte aan koper | Verkoper | Koper | Bevestigde ETA met verwijzing naar bron bij bezorger |
| Herziene ETA na file | Bezorger | Verkoper | Nieuwe ETA, vorige versie, reden vertraging, versie 2 |
| Bijgewerkte leverbelofte | Verkoper | Koper | Nieuwe bevestigde ETA; oorspronkelijke ETA als verouderd gemarkeerd |
| Ontvangst/aflevering | Koper | Verkoper en bezorger | Status ontvangen en simulatiemoment |

Een organisatie kan haar eigen brondata lezen. Overige toegang wordt geweigerd, tenzij een afzonderlijke expliciete regel hierboven of in de uitvoeringscontext bestaat. Stuur bijvoorbeeld geen chauffeur van de eerste rit naar het mobiele dossier van de koper als die informatie niet nodig is. Het centrale trainingsscherm mag de gemaakte chauffeurkeuze wel tonen. Laat een ontvanger een resource nooit zonder beleid verder verspreiden; de verkoper mag in dit spel de leverbelofte aan koper publiceren met bronverwijzing.

Voor S02 vertaalt één begrijpelijke knop Abonneer op relevante orderinformatie zich intern naar meerdere gerichte subscriptions bij de bevoegde bronnen. Niet elke organisatie ontvangt elk event. Zorg dat alle vereiste subscriptions vóór de betreffende afhankelijke vraag actief zijn. Registreer initiële geautoriseerde uitvoeringscontext zodat deze setup niet afhankelijk wordt van een nog niet ontvangen toekomstig event.

De normale BDI-flow is:

`brongegeven wijzigt → publicatierecht controleren → relevante geautoriseerde abonnementen bepalen → notificatie leveren → afnemer beoordeelt context → automatisch bronendpoint raadplegen → bron toetst leesrecht → minimale data terug → eigen dossier actualiseren → speler bevestigt`.

Toon op de telefoon bijvoorbeeld Gegevens van: Bezorger · ETA versie 2 · Ontvangen zojuist. Toon op de beamer standaard de concrete wijziging, de relevante ontvanger, de notificatie, de bronopvraging en de uitkomst. Maak het verschil tussen een reeds gewijzigde bronwaarde en de nog oude informatie bij de ontvanger zichtbaar; werk die ontvangerweergave pas bij wanneer de echte spelgebeurtenis dit bevestigt. Bij een bronwijziging markeer je de eerdere waarde als verouderd; een oudere late response mag de nieuwe waarde niet overschrijven.

Voor de leerbaarheid kiest deze remake notificaties met weinig metadata en een aparte bronopvraging. BDI kan ook gecontroleerde varianten met beperkte gegevens in notificaties ondersteunen; presenteer het gekozen patroon daarom als een implementatiekeuze voor dit spel. Bouw die varianten niet automatisch bij.

## 10. Peer-to-peer en technische architectuur

**Behoud peer-to-peer op organisatieniveau:** gegevens worden aangeboden door de bronorganisatie en gericht opgehaald door een gerechtigde afnemer. Association Registry en Orchestration Registry zijn geen tussenstation voor operationele gegevens. Het centrale beamerscherm visualiseert het hele spel via een aparte trainingsprojectie. Het levert geen logistieke gegevens aan de mobiele dossiers en wordt geen schakel in hun bron-naar-afnemeruitwisseling.

Scheid vier lagen in code en documentatie:

1. **Spelbesturing:** sessies, rollen, processtappen, antwoorden valideren, timers en animaties.
2. **Vertrouwens- en betrokkenheidscontext:** Association, transportrollen en beleid.
3. **Organisatiegegevensdiensten:** eigen bronresources, bronversies, subscriptions en afnemersdossiers.
4. **Trainingsprojectie:** een alleen-lezen weergave van opdrachten, gemaakte keuzes, gegevensposities, communicatiestappen en logistieke gebeurtenissen voor host en zaal. Deze volgt het spel en heeft geen autoriteit om organisatiegegevens te wijzigen of namens spelers te bevestigen.

Implementeer vier afzonderlijk adresseerbare logische gegevensdiensten, bijvoorbeeld `buyer-data`, `seller-data`, `carrier-data` en `delivery-data`. Elke dienst heeft een eigen eigenaarsscope, repository, policy-evaluator en bronresource-API. De mobiele afnemer vraagt de toegestane resource bij die bron-API op. Er is geen generieke getEverythingForSession-API voor spelers.

Voor dit educatieve product mogen de vier logische diensten op gedeelde hosting en dezelfde database-infrastructuur draaien, mits toegangscontroles en scopes daadwerkelijk gescheiden zijn. Documenteer dit eerlijk als een simulatie van federatieve bron-naar-afnemeruitwisseling op gedeelde infrastructuur. Claim geen fysieke browser-naar-browserverbinding of volledig decentraal productienetwerk. Ontwerp de bronservice-adapter zo dat afzonderlijke deployments later mogelijk zijn. WebRTC is geen BDI-vereiste en wordt niet toegevoegd aan de basisversie.

Kies voor een uitvoerbare standaardarchitectuur:

- Frontend: React, TypeScript en Vite; HTML/CSS/SVG, geen Windows-runtime of game-plugin nodig.
- Backend: Supabase voor gebruikersidentiteiten, Postgres, serverfuncties en afgeschermde realtime meldingen.
- Servertransacties/RPC's voor rolclaim, stapvalidatie en geaccepteerde acties; nooit meerdere onbeveiligde clientwrites om één spelhandeling uit te voeren.
- Organisatiegebonden API's via server-/Edge Functions met expliciete autorisatie. Realtime vervoert beperkte, geautoriseerde meldingen en toegestane spelprojecties.
- Een database-outbox registreert bronwijziging en te leveren events in dezelfde transactie. Een herstartbare dispatcher verzorgt levering en retries; private eventhistorie maakt inhalen mogelijk. Documenteer hoe deze dispatcher daadwerkelijk wordt uitgevoerd en gepland.
- Gebruik een publieke frontendconfiguratie voor project-URL en publishable key. Beheersleutels/service-role secrets blijven server-side. Iedere serverfunctie die zulke rechten gebruikt, voert zelf alle noodzakelijke identiteits-, sessie-, rol- en resourcecontroles uit.
- Gebruik anonieme login met een echte tijdelijke gebruikersidentiteit voor de spelers; verwar dit niet met de publieke projectkey. Voorzie rate limits en configureerbare bescherming tegen ongewenst aanmaken van sessies.

Statische hosting op GitHub Pages heeft de voorkeur. Gebruik hash-routing of een gelijkwaardig aantoonbaar werkende aanpak voor directe QR-links en refresh onder een repository-subpad. Bereken QR-links met de geconfigureerde publieke HTTPS-basis-URL inclusief dat subpad. `localhost` mag nooit in de QR van een gedeployde game staan.

Een aparte backend blijft nodig: GitHub Pages verzorgt geen autoritatieve multi-device rolclaims of duurzame serverstatus. Vercel is een alternatief voor dezelfde frontend; stap niet zonder noodzaak over. Als je toch een andere backendarchitectuur kiest, motiveer dat in een korte beslisnotitie en behoud alle contracten. Een aanpassing van hosting rechtvaardigt geen verlies van peer-to-peer-semantiek of sessie-isolatie.

Maak de gekozen combinatie lokaal startbaar en lever configuratie voor online gebruik. Maak geen cloudaccounts aan en activeer geen betaalde diensten zonder expliciete opdracht. Ontbrekende credentials blokkeren lokaal ontwikkelen en testen niet; vermeld exact wat voor publicatie nog nodig is.

## 11. Datamodel, servercontracten en isolatie

Gebruik minstens de volgende entiteiten, met passende relaties en indexen:

- `sessions`: ID, code, hostUserId, status, currentRoundId, createdAt, expiresAt;
- `role_assignments`: sessionId, organizationId, role, playerUserId, assignmentVersion, connectionStatus;
- `rounds`: ID, sessionId, mode, stepId, stateVersion, scenarioSeed, simTime, pausedState, presentationStatus, presentationUntil en actionEnabledAt;
- `orders`, `transports`, `transport_legs` met expliciete onderlinge relaties;
- `association_memberships`: organizationId, associationId, fictieve identiteit, status en geldigheid;
- `transport_participations`: sessionId, roundId, transportId, organizationId, role, issuedBy, geldigheid en eventuele delegationRef;
- `source_resources`: scope, ownerOrganizationId, resourceType, resourceId, version, effectiveAt en payload;
- `policies`: bron, ontvanger/rol, context, resourceType, actie, toegestane velden en geldigheid;
- `subscriptions`: scope, subscriber, publisher, subject, eventTypes, status en cursor;
- `event_outbox`, `event_deliveries`, `received_resources`, `action_attempts` en `round_metrics`.
- `training_projection_events`: een apart afgeschermde, opnieuw op te bouwen projectiestroom met sessionId, roundId, sequence, stepId, actorRole, displayType, zichtbare ingediende keuze/resultaat, relevante organisatie, versie en tijd. Neem uitsluitend fictieve spelinformatie op; geen authenticatiegegevens of technische secrets.

Database-constraints borgen één actieve toewijzing per `(sessionId, role)` en één spelrol per `(sessionId, playerUserId)`. Foreign keys of equivalente controles voorkomen dat resources uit een andere sessie of ronde aan elkaar worden gekoppeld. Scope elke query, mutatie, notificatie en cache minstens op sessie en waar relevant ronde/transport. Dezelfde product- of rolnaam is nooit een unieke contextsleutel.

Definieer minimaal de serveracties `createSession`, `claimRole`, `releaseRole`, `markReady`, `startRound`, `submitAction`, `activateSubscriptions`, `getAuthorizedSourceResource`, `getTrainingProjection`, `getTrainingHistory`, `getPlayerProjection`, `pause`, `resume`, `getRecoverySnapshot`, `getMissedEvents`, `finishSession`.

Een actie bevat `sessionId`, `roundId`, `stepId`, `expectedStateVersion`, `actionId` en de gekozen waarde. De server bepaalt de actor op basis van de geauthenticeerde identiteit; vertrouw geen meegestuurde role of organizationId als bewijs. Valideer fase, beurt, context, versie en optie. `actionId` is een idempotency key: een retry of dubbele tap voert dezelfde geldige actie maar één keer uit.

Een educatief event-envelope bevat bijvoorbeeld `eventId`, `schemaVersion`, `sessionId`, `roundId`, `transportId`, `legId`, `eventType`, `publisherOrganizationId`, `subjectType`, `subjectId`, `resourceVersion`, `occurredAt`, `publishedAt`, `sourceRef`, `correlationId`, `causationId` en een per-bron sequence. Verstuur alleen de velden die de ontvanger mag ontvangen. Dit is een gameschema, geen claim op een officiële BDI/LEO/CloudEvents-implementatie.

Scheid simulatietijd van echte meettijd. `occurredAt` kan een simulatiemoment beschrijven; publicatie, ontvangst, acties en prestaties gebruiken daarnaast echte servertijd. Bereken doorlooptijden nooit uit tegenstrijdige apparaatklokken.

Beveiligingseisen die onderdeel zijn van functionele correctheid:

- Database row-level security of equivalente policies zijn standaard deny; client-side filtering is niet voldoende.
- Realtime-kanalen zijn private en hebben autorisatie, ook als hun namen onvoorspelbaar zijn.
- Het beamermodel is een afgeschermde trainingsprojectie voor de host. Die mag ingediende spelkeuzes, product, chauffeurs, ETA's, antwoorden, fouten en informatietoestanden van alle vier de organisaties binnen de eigen sessie bevatten. Het is geen publiek toegankelijk of door sessiecode alleen uitleesbaar kanaal.
- Een mobiele spelersclient ontvangt uitsluitend eigen brondata, geautoriseerd ontvangen data en noodzakelijke algemene spelstatus. Een speler kan de uitgebreide trainingsprojectie niet via API of een andere route opvragen.
- De host bepaalt beheeracties. Componenten die het beamerscherm renderen zijn alleen-lezen; voeg daar geen knop toe om namens een speler een inhoudelijk antwoord te kiezen.
- Stuur geen toekomstige of nog niet gemaakte keuzes, verborgen validatiesleutels of herleidbare random seeds naar enige client. Bekende fictieve spelwaarden worden bewust op het trainingsscherm getoond; een bevestigingsvraag krijgt daar alleen een BDI-hint als de actieve rol die informatie daadwerkelijk ontvangen heeft.
- Een serverparameter uit een bronlink is geen autorisatiebewijs. Controleer bron, scope en identiteit bij elke leesaanvraag.
- Een uitgetreden/vervangen speler verliest nieuwe toegang. Trek realtime-toegang actief in of wissel de kanaal-/toewijzingsversie; ga niet ervan uit dat een al geopende verbinding vanzelf nieuw beleid toepast.
- Persoonlijke state, caches en sleutels van een oude ronde mogen geen antwoorden in een nieuwe ronde vullen.

## 12. Herverbinden, pauzeren en synchroniseren

Telefoons kunnen in slaapstand gaan, refreshen of tijdelijk geen wifi hebben. Toon duidelijke statussen Verbonden, Opnieuw verbinden en Verbinding verbroken. Blokkeer nieuwe beslissingen zolang de client geen actuele toestand heeft. Bied geen schijnsucces voor een offline opgeslagen antwoord.

Na herverbinden: authenticeer, controleer actieve toewijzing, laad een toegestane snapshot en haal gemiste geautoriseerde events op vanaf de laatste cursor. Verwerk dubbele berichten idempotent. Een oud event overschrijft nooit een nieuwere bronversie. Een ontbrekende volgorde/versie veroorzaakt reconciliation, geen willekeurige gok over de actuele stand.

Delivery, ontvangst, verwerking en zakelijke bevestiging zijn verschillende toestanden. Een afgeleverd belletje betekent nog niet dat de speler de ETA heeft bevestigd. Sla die stappen afzonderlijk op voor herstel en leerfeedback.

Gebruik de server als bron van spelstatus. Animaties zijn afgeleide weergaven met een startmoment en duur, geen onafhankelijke timers die elk apparaat een volgende beurt laten claimen. Aankomstmomenten en procesovergangen mogen ook na tabsluiting of serverherstart correct worden hervat.

Bij verlies van een actieve speler pauzeert de game na een korte configureerbare graceperiode. Alleen de host hervat wanneer het team weer klaar is. Pauzes tellen niet mee als actieve beslisduur. Bevries simulatietijd en geef alle schermen dezelfde pauzestatus.

Bij hostrefresh kan dezelfde hostidentiteit de sessie herstellen. Bij hostverlies blijft de status bewaard en pauzeert het spel; wijs niet automatisch een willekeurige speler aan als nieuwe host. Opnieuw beginnen reset alleen de bedoelde sessie/ronde. Esc sluit in de webversie eventueel fullscreen of opent een pauzemenu; beëindig niet stilzwijgend alle telefoons.

Na aflevering sluiten subscriptions en tijdelijke transportrechten volgens het spelbeleid. De rondevergelijking gebruikt opgeslagen geaggregeerde uitkomsten. Association-deelname eindigt niet automatisch omdat één transport is voltooid. Gebruik een configureerbare sessie-expiry, bijvoorbeeld 24 uur, en documenteer opruiming van tijdelijke spelgegevens.

## 13. Centraal trainingsscherm en mobiele gebruikerservaring

### Het centrale scherm is de hoofdweergave voor de training

Een deelnemer zonder telefoon moet gedurende beide rondes kunnen begrijpen: wat er gebeurt, wie aan zet is, wat die speler moet beslissen, welke keuze is gemaakt, of een bevestiging klopt, wie bepaalde informatie al heeft en waarom het proces verdergaat of wacht. Dit moet zonder het bekijken van een telefoonscherm en zonder voortdurende mondelinge beschrijving door de spelleider mogelijk zijn. Het volledige meekijken is standaard actief en is geen optionele uitbreiding.

Toon zichtbaar het label Trainingsoverzicht — wat iedere partij weet. Maak daarmee duidelijk dat het een didactische weergave over het spel is. In de gesimuleerde logistieke werkelijkheid blijven organisaties autonoom en krijgen zij alleen de gegevens waarop zij recht hebben. Het centrale overzicht verandert die rechten niet en verzendt geen operationele data namens een organisatie.

### Vaste opbouw tijdens het spelen

Ontwerp voor 1920 × 1080 met grote, leesbare tekst en zonder scrollen voor de actuele kerninformatie:

1. **Bovenbalk:** sessienaam, Ronde 1 — Zonder BDI of Ronde 2 — Met BDI, actuele fase, simulatiedag/tijd en eventuele pauze/verbindingsstatus.
2. **Logistieke kaart:** de vier organisaties/locaties, voertuigen en lading; verplaatsingen, laden, overslag, file, controles en aflevering zijn zichtbaar.
3. **Actieve opdracht:** de rol aan zet, exacte vraagtekst en alle opties uit de mobiele opdracht. Toon ze met dezelfde labels en volgorde. Alleen de speler kiest op de telefoon. Na indienen zijn gekozen optie en resultaat zichtbaar voor de zaal.
4. **Vier compacte rolpanelen:** organisatienaam, rol, activiteit en relevante actuele informatie in het eigen dossier. Benoem de verschillen tussen partijen, bijvoorbeeld Bezorger: nieuwe ETA 06:30 en Verkoper: laatst ontvangen ETA 06:00. Toon afzonderlijke chauffeurs per vervoersdeel.
5. **Gebeurtenissenlijst:** de laatste drie tot vijf afgeronde handelingen in gewone taal, zoals Koper bestelt een camera, Vervoerder kiest chauffeur Noor of Verkoper bevestigt de nieuwe ETA. Eerdere stappen blijven via een pauzeerbare geschiedenis terug te bekijken.
6. **Communicatie-uitleg:** een compact, goed leesbaar onderdeel dat de huidige informatievraag of uitwisseling laat zien. Zonder BDI: Afstemming nodig tussen bezorger en verkoper. Met BDI: Melding → toegang controleren → gegevens ophalen → beschikbaar → bevestigd.

In de BDI-ronde staan Association-deelnemers en de organisaties met hun transportrollen eveneens in beeld. Gebruik daarvoor een compacte extra strook/paneel, met toelichting die de spelleider tijdens een pauze kan vergroten. Het centrale scherm blijft een logistiek verhaal; technische IDs en requestlogs horen niet in de standaardweergave.

### Wat wanneer zichtbaar wordt

| Gebeurtenis | Centrale weergave | Mobiele dossiers |
|---|---|---|
| Een speler is aan zet | Volledige vraag en opties, actieve rol gemarkeerd | Actieve speler krijgt dezelfde bedienbare vraag; anderen wachten |
| Koper kiest een product | Meteen na geaccepteerd indienen: het gekozen product en bij wie het bekend is | Bij koper opgeslagen; bij verkoper pas via de voor deze ronde geldende afstemming/gegevensontvangst |
| Vervoerder of bezorger kiest chauffeur | Gekozen naam/avatar met organisatie en vervoersdeel | Eigen bronwaarde; overige rollen volgens hun informatiepositie |
| Een partij kiest een ETA | Exacte tijd, simulatiedag, traject en versie, eerst bij de bronorganisatie | Alleen gerechtigde ontvangers krijgen automatische updates in BDI |
| Een speler geeft een fout bevestigingsantwoord | Ingediende optie, tekst Komt niet overeen en zichtbaar opnieuw proberen | Vraag blijft actief; geen voortgang voorbij de controle |
| Een bevestiging klopt | Ingediende optie, tekst Bevestigd en zichtbare consequentie, zoals poort open | Correcte bevestiging geregistreerd |
| Een BDI-notificatie wordt verstuurd | Pijl/bel van uitgever naar de werkelijk geselecteerde ontvanger(s); type wijziging zichtbaar | Alleen geautoriseerde ontvangers ontvangen de notificatie |
| Brondata is opgevraagd en ontvangen | Opvraging/antwoord zichtbaar; informatie bij ontvanger gaat naar de ontvangen versie | Ontvangen gegevens en hint worden pas nu beschikbaar |
| File en nieuwe ETA | Voertuig staat in file; oude en nieuwe ETA met ontvangerstatus naast elkaar | Geen automatische bijwerking zonder de vereiste uitwisseling |
| Ronde is afgerond | Aflevering, overzicht van beslissingen en vergelijking | Eigen ronde-uitkomst |

Toon concrete gemaakte keuzes direct; stel ze niet uit tot het eind van de ronde. Laat bij een fout niet automatisch een nog niet ontvangen correct antwoord in het actieve vraagpaneel markeren. De zaal kan de betreffende bronwaarde wel in het organisatieoverzicht hebben gezien. In BDI spiegelt het vraagpaneel de gele ondersteuning zodra die op de actieve telefoon beschikbaar is. Maak het verschil tussen een keuze, een brongegeven, een ontvangen gegeven en een bevestiging zichtbaar met tekst, niet alleen met kleur.

### Voorbeeld dat exact moet werken

De bezorger heeft eerder dag 2 om 06:00 als ETA gekozen. De verkoper heeft die bevestigd. De bezorgtruck komt in de file. De bezorger kiest 06:30.

- In beide rondes ziet de zaal de file, de keuze 06:30 en bij de bezorger ETA versie 2. Bij de verkoper staat nog ETA versie 1 — 06:00 totdat de toepasselijke stap is verwerkt.
- Zonder BDI toont het scherm Afstemming nodig: bezorger → verkoper. Het suggereert geen automatisch verstuurde notificatie. De verkoper vraagt de nieuwe tijd na en kiest een antwoord op zijn telefoon. Het centrale scherm laat de ingediende keuze, eventuele fout en uiteindelijke bevestiging zien. De game stelt niet vast of iemand werkelijk iets hardop heeft gezegd; Afgestemd/bevestigd wordt afgeleid van een correcte expliciete bevestiging.
- Met BDI volgt de zaal de geautoriseerde melding, het ophalen bij de bezorger en de update in het dossier van de verkoper. Daarna is 06:30 als ontvangen waarde gemarkeerd bij de bevestigingsvraag. De verkoper bevestigt zelf en geeft de aangepaste leverbelofte door aan de koper.
- Het actuele dossier van de koper verandert pas bij diens toepasselijke leverbelofte/ontvangststap. Het centrale scherm toont dat afzonderlijk, ook al kent het publiek de nieuwe tijd al.

### Tempo, terugkijken en betrouwbaarheid

Toon iedere ingediende keuze en feedback minstens circa drie seconden, configureerbaar en gelijk in beide rondes. Pauzeer de activering van de volgende spelersvraag tijdens deze korte presentatieperiode, zodat handelingen niet onleesbaar voorbijflitsen. Bij een fout antwoord wordt een nieuwe poging eveneens pas na de feedbackperiode vrijgegeven. De server handhaaft deze grens; de actieve beslisklok start of hervat pas bij het vrijgeven van de actie. Er is standaard geen spelleidersklik per antwoord nodig.

De spelleider kan pauzeren en eerdere stappen terugkijken met de vraag, gemaakte keuze, resultaat, kennisposities en communicatie. Dit verandert geen speldata en verzendt geen events opnieuw. Label het scherm dan Terugblik — spel gepauzeerd en bied Terug naar live. Laat bij hervatten de huidige status zien. Gebruik projectie-sequences en herstel na refresh zodat snelle keuzes, foute pogingen en tussenliggende notificatiestappen niet verdwijnen uit de geschiedenis. Bij achterstand toont het scherm Bijwerken; geef een gereconstrueerde animatie niet uit als een nieuwe gegevenslevering.

Deze presentatiepauzes en eventuele spelleiderpauzes krijgen eigen tijdmetingen. Zij tellen niet mee als actieve beslisduur of als technisch tijdsverschil tussen beide rondes.

### Lobby, telefoons en bediening

De lobby toont vier grote QR-kaarten, sessiecode, korte rolbeschrijvingen, verbindingsstatus en de startknop. Codes moeten op zaalafstand scanbaar zijn, met voldoende contrast en vrije marge. Alleen de vier actieve spelers claimen een rol. Overige trainingsdeelnemers volgen de beamer; zij hoeven nergens in te loggen.

De mobiele interface is portrait-first: bovenaan sessie/ronde en rol, daaronder één actieve opdracht. Gebruik grote knoppen, iconen én tekst, geen hover-afhankelijkheid en geen verplichte horizontale stand. Aanraakdoelen zijn minimaal circa 44–48 CSS-pixels. Onderaan staan Mijn informatie en Meldingen. Wachtende spelers zien wie aan zet is en kunnen hun eigen informatie teruglezen.

In zonder-BDI bevat Mijn informatie eigen gegevens, handmatige notities en eigen expliciete bevestigingen. In BDI komen toegestane ontvangen gegevens met herkomstorganisatie, versie en status erbij. Het centrale scherm is geen aanvullende gegevensfeed voor de telefoons. De spelers bedienen uitsluitend hun eigen rol via de telefoon; de zaal kijkt mee op de beamer.

Beheer omvat start, pauze/hervat, uitleg overslaan, geschiedenis bekijken, verbindingstatus, rol vrijgeven, ronde opnieuw beginnen en sessie beëindigen. Reset en beëindiging vragen binnen de app een bevestiging. Verberg beheerknoppen subtiel wanneer zij niet nodig zijn. Normaal meekijken is geen hulpactie. Een expliciete ingreep van de spelleider om een speler inhoudelijk te helpen wordt wel als hulp gemarkeerd.

Taal is standaard Nederlands. Bied Nederlands/Engels en volume/mute. De host kiest de sessietaal. Geluid komt standaard alleen van het centrale scherm; telefoons zijn stil. Audio start pas na een gebruikershandeling en alle uitleg blijft zonder geluid bruikbaar. Activeer geen browsernotificaties automatisch.

## 14. Visuele uitwerking en verteltekst

Maak een verzorgde, vriendelijke logistieke kaart met SVG: turquoise water, groen land, lichte wegen, twee herkenbare DC's en het beveiligde terrein van de koper. Gebruik een gebogen eilandvorm als compositiebasis, met een kustweg en een kronkelweg op het tweede vervoersdeel. Plaats verkoper linksonder, vervoerdersbasis linksboven, bezorg-DC rechtsboven en koper rechtsonder, of gebruik een aantoonbaar even goed leesbare variant met dezelfde route.

Geef koper, verkoper, vervoerder en bezorger elk een eigen herkenbaar pictogram en consistente accentkleur. Gebruik rolkleuren nooit als enige informatiedrager. Een gewone vrachtwagen voert de eerste rit uit; een kleinere bezorgtruck de tweede. Dezelfde lading moet zichtbaar van voertuig wisselen bij de overslag.

Visualiseer:

- ophalen: aankomst, identiteitscontrole, poort open, laden;
- eerste rit: truck beweegt langs het pad met de lading;
- overslag: korte avond/nachtovergang en verplaatsing van de lading naar de bezorgtruck;
- file: bezorgtruck vertraagt en stopt achter een zichtbare rij auto's, remlichten en label Vertraging; niet alleen een pop-up;
- aflevering: poortcontrole, uitladen en voltooid-status;
- notificaties: kleine bel/envelop van bron naar geautoriseerde ontvanger;
- data ophalen: een tweede, anders gestileerde pijl van afnemer naar bron en terug, met duidelijke labels Melding en Gegevens ophalen.

Vermijd pijlen die alle data eerst naar het associatieregister, een centraal BDI-logo of het beamerscherm laten stromen. Registers leveren context; bronorganisaties leveren gegevens. Houd de pijlen tijdelijk en rustig zodat de logistieke beweging begrijpelijk blijft.

Gebruik geel plus tekst voor Beschikbaar uit bron, rood plus tekst voor Onjuist en groen plus tekst voor Bevestigd. Geef focus en selectie andere stijlen zodat een hovergrijs of actieve knop niet met juistheid wordt verward. Ondersteun reduced motion en toetsenbordbediening op het hostscherm.

Schrijf korte vertelteksten die de actuele stap verklaren. Bijvoorbeeld: De vervoerder haalt de lading op bij de verkoper; In de nacht verhuist de lading naar de bezorgtruck; De file verandert de verwachte aankomsttijd. Wie moet dat weten?; De bron heeft een nieuwe ETA. Gerechtigde betrokken partijen ontvangen een melding en halen de update op.

Maak de benodigde vectorillustraties en een eigen woordmerk BDI Game. Gebruik een tekst/ondertiteling-first intro; alle assets moeten onderdeel van de opgeleverde applicatie zijn. Een optionele browserstem mag als expliciete instelling dienen, maar is geen voorwaarde om te kunnen spelen. Alle teksten op beamer en telefoons staan rechtop in de leesrichting van het betreffende scherm.

## 15. Uitkomsten en nabespreking

De basisgame is coöperatief; er zijn geen individuele winnaars. Toon na iedere ronde Afgeleverd en een begrijpelijke samenvatting. Na de tweede ronde staan de resultaten naast elkaar.

Meet en toon:

- Totale ronde-duur, actieve beslisduur, uitleg/animatietijd, presentatieperioden voor de zaal en pauzeduur apart.
- Aantal onjuiste bevestigingspogingen.
- Tijd van een bronkeuze tot de correcte bevestiging door de afhankelijke rol.
- Specifiek: tijd tussen de nieuwe ETA van de bezorger en bevestiging door verkoper; vervolgens beschikbaarheid van de leverbelofte bij koper.
- In BDI: aantal relevante ontvangen notificaties en geslaagde bronopvragingen. Meer berichten betekent niet automatisch beter.
- Voltooide processtappen, eventuele hulpacties en verbindingsproblemen.

Claim geen gemeten aantal mondelinge gesprekken: de app kan dat niet weten zonder expliciete registratie. Je mag het aantal stappen dat mondelinge afstemming nodig had tonen, mits duidelijk als proceskenmerk benoemd. Voeg geen verborgen microfoonmeting toe.

Voor twee rondes gelden dezelfde processtructuur, animatieduren en verstoring. Spelers maken opnieuw keuzes; kopieer de geselecteerde producten/chauffeurs/ETA's niet automatisch. Vermeld bij de vergelijking dat de tweede ronde ook profiteert van bekendheid met het spel en dat beide rondes een zichtbaar trainingsoverzicht hebben. Spelers kunnen dit overzicht eveneens lezen; conclusies gaan over de ervaren coördinatie en daadwerkelijke systeemuitwisseling, niet over een gecontroleerde test met verborgen informatie. Noem tijdsverschillen geen wetenschappelijk bewijs van BDI-rendement en toon geen gegarandeerde procentuele besparing.

Sluit af met reflectievragen: Wie had welke informatie als eerste? Welke informatie moest je navragen? Wat gebeurde er na de file? Wie mocht een update ontvangen, en waarom? Welke gegevens bleven bij de bron? Welke keuzes bleven mensenwerk?

## 16. Implementatievolgorde en oplevering

Werk in bruikbare stappen, maar lever uiteindelijk het gehele hieronder afgebakende product op:

1. Domeinmodel, configureerbaar scenario en servervalidatie voor de volledige cyclus.
2. Identiteiten, sessies, atomaire rolclaims en één host met vier echte browserclients.
3. Werkende ronde zonder BDI, inclusief product, chauffeurs, ETA's, controles, file en aflevering.
4. Organisatiegegevensdiensten, registers als context, beleid, subscriptions en BDI-ronde.
5. Het volledige centrale trainingsoverzicht met alle opdrachten, keuzes, informatieposities en communicatiestappen; mobiele schermen en rondevergelijking.
6. Herstel, isolatie-, race- en toegangscontroles; volledige end-to-end tests.
7. GitHub Pages-configuratie, alternatieve Vercel-instructies en duidelijke backendsetup.

Lever broncode, database-migraties, policies, serverfuncties, scenariofixtures, tests, `.env.example` zonder secrets en een README. Voeg `docs/gameplay.md`, `docs/architecture.md`, `docs/bdi-model.md`, `docs/design-decisions.md` en `docs/deployment.md` toe. Beschrijf hierin de geïmplementeerde spelregels, architectuur, kijkrechten voor de training, operationele datatoegang, eigen technische keuzes en de grens tussen basisfunctionaliteit en niet-uitgevoerde ideeën. Neem geen literatuurlijst, tijdcodes of verwijzingen naar niet-meegeleverde referentiebestanden op.

Voorzie een expliciete lokale testmodus met vijf clients en een script om twee onafhankelijke sessies te openen. Deze testmodus is geen vervanging voor echte communicatie tussen apparaten. Een een-tabblad-demo via localStorage of BroadcastChannel voldoet niet aan de multiplayeropdracht.

Laat instellingen zoals simulatietijden, animatieduren, expiry, teksten, producten en avatarsets centraal configureerbaar zijn. Voeg geen zwaar algemeen workflowplatform toe. Houd de spelcyclus en het gegevensmodel zelfstandig testbaar.

## 17. Acceptatiecriteria en verplichte controles

Bewijs onderstaande gevallen met passende unit-, integratie- en browsertests. Gebruik voor speleridentiteiten afzonderlijke browsercontexten, zodat gedeelde browseropslag niet onbedoeld één gebruiker simuleert.

1. Eén host en vier telefoons kunnen beide rondes volledig uitspelen zonder console- of serverfouten.
2. Minstens twee gelijktijdige sessies met dezelfde vier rolnamen blijven volledig gescheiden in API's, realtime, resultaten en resetacties.
3. Twee simultane claims op één rol leveren precies één winnaar op. De QR verdwijnt pas na succesvolle claim. Een oude QR neemt geen bezette rol over.
4. Een speler kan niet de rol van iemand anders aannemen, de ronde starten of een actie van een andere rol uitvoeren door een verzoek aan te passen.
5. De productkeuze en bevestiging werken voor elk van de drie producten. Een andere antwoordvolgorde verandert de juistheidscontrole niet.
6. De twee chauffeurskeuzes zijn onafhankelijk. Alle drie de identiteitscontroles gebruiken de juiste chauffeur en juiste leg.
7. De verkoper bevestigt de oorspronkelijke en herziene bezorg-ETA. Een nieuwe ETA komt aantoonbaar van de bezorger; de verkoper is bron van zijn eigen bevestiging.
8. Een fout antwoord blijft herstelbaar, telt maar één keer per poging en verplaatst geen truck voorbij de controle.
9. In zonder-BDI bevatten mobiele spelersresponses en -kanalen geen automatisch gedeelde antwoorden van andere organisaties. De hostprojectie mag alle reeds ingediende spelkeuzes wel tonen. Een spelersidentiteit krijgt geen API-toegang tot die hostprojectie. Er is geen automatische BDI-bronopvraging.
10. In BDI zijn vier subscriptionsets actief. Relevante brongegevens worden na notificatie opgehaald en ondersteunen het antwoord pas na geslaagde autorisatie en ontvangst.
11. Association-lid zonder passende transportbetrokkenheid wordt geweigerd. Transportbetrokkenheid zonder passend bronbeleid wordt eveneens geweigerd. Een gebruiker uit een andere sessie wordt altijd geweigerd.
12. Ook het ontvangen van notificaties en lezen van hun metadata is afgeschermd. Een verkeerde ontvanger kan een onderschepte bronlink niet gebruiken.
13. Na rolvervanging kan de oude speler geen nieuwe acties, notificaties of bronopvragingen meer doen, ook niet met een al open verbinding.
14. Een dubbele tap of herhaald HTTP-verzoek voert de actie slechts eenmaal uit. Een verouderde stateVersion krijgt een conflict plus actuele toegestane status.
15. Bij refresh tijdens planning, animatie, file en eindcontrole herstelt de juiste stap. Refresh van host bewaart alle rollen en rondegegevens.
16. Bij tijdelijk offline gaan herstelt de client via snapshot/cursor. Een gemist event wordt ingehaald; dubbele of omgekeerd afgeleverde ETA-events laten versie 2 actueel.
17. Een order die vóór subscription ontstond, is na geautoriseerde catch-up beschikbaar. Na rondewissel wordt data uit ronde 1 nooit antwoordbron in ronde 2.
18. Registers tonen deelname en rollen. De afzonderlijke rolpanelen tonen concrete gemaakte keuzes en ontvangen gegevens per organisatie. De trainingsprojectie maakt het verschil tussen register, bron, afnemer en publieksoverzicht begrijpelijk.
19. De file en fysieke logistiek zijn in beide rondes gelijkwaardig. Geen kunstmatig gegarandeerd voordeel of verzonnen prestatiecijfers.
20. Controleer schermen van circa 360 × 640 tot 430 × 932 en beamer 1920 × 1080; geen horizontale scroll, onleesbare QR of overlappende knoppen. Controleer iOS Safari en Android Chrome waar beschikbaar; vermeld eventuele niet-geteste omgevingen.
21. Een direct gescande productielink onder GitHub Pages-repositorypad werkt, ook na refresh; alle verbindingen gebruiken passende HTTPS/CORS-instellingen en er lekken geen serversecrets in de frontendbundel.
22. De README laat een nieuwe ontwikkelaar database, functies, dispatcher en frontend daadwerkelijk starten. Vermeld uitgevoerde tests en resterende deploymenthandelingen eerlijk.
23. Een toeschouwer kan beide volledige rondes op alleen de beamer volgen: elke vraag, opties, ingediende keuze, fout, correctie, gebeurtenis en logistiek gevolg is zichtbaar. Geen vereiste informatie verschijnt uitsluitend op een telefoon.
24. Voor iedere step-ID is vastgelegd en getest wat het centrale scherm toont. Iedere keuze/feedback blijft de ingestelde presentatieperiode leesbaar, ook bij snelle spelersacties; de volgende vraag wordt daarna geactiveerd.
25. Het filevoorbeeld 06:00 → 06:30 werkt in beide rondes: het centrale scherm toont de nieuwe bronwaarde en de nog oude ontvangerwaarde afzonderlijk. Alleen de echte ontvangst-/bevestigingsstappen werken het betreffende roldossier bij.
26. In BDI zijn notificatie, toegangscontrole, bronopvraging, ontvangst en zakelijke bevestiging afzonderlijk te volgen op de beamer. Een geanimeerde bel wordt niet als voltooide zakelijke bevestiging geteld.
27. Terugkijken in gepauzeerde toestand, hostrefresh en herstel van de trainingsprojectie veranderen geen speltoestand, versturen geen operationele events opnieuw en verliezen geen eerdere beslissingen.
28. Een host kan uitsluitend de uitgebreide projectie van zijn eigen sessie lezen. QR-codes, sessiecodes en speleraccounts verlenen geen toegang tot de projectie-API of beheerrechten.
29. De standaard beamerweergave past bij 1920 × 1080 zonder scrollen: kaart, actuele vraag/opties, vier compacte rolpanelen en actuele communicatie blijven leesbaar. Test de opstelling ook in fullscreen met minimaal circa 24-punts-equivalente kerntekst, voldoende contrast en geen overlappende informatielagen.

Controleer vóór afronding de teksten en implementatie nog eenmaal inhoudelijk: BDI blijft een afsprakenstelsel; Association-deelname, transportrol en toestemming zijn gescheiden; de bron beslist over toegang; notificaties en payloads zijn onderscheiden; operationele gegevens worden bron-naar-afnemer opgehaald; de spelleider is geen logistieke data-eigenaar; Orchestration Registry is niet de centrale procesmotor.

## Potentiële uitbreidingen — niet automatisch uitvoeren

**Deze sectie is uitsluitend een ideeënlijst. Implementeer, scaffold of activeer geen van deze functies zonder een afzonderlijke expliciete opdracht. Ook geen verborgen feature flags, lege menu's of database-uitbreidingen alvast toevoegen.**

- Een verdiepingsscenario waarin een transportpartner vervangen wordt en oude toegangsrechten aantoonbaar vervallen.
- Twee Associations en een uitgewerkte federatieve vertrouwenscontrole tussen organisaties.
- Meerdere orders, gebundelde ladingen en identifier-overgangen met geautoriseerde inhaal van gemiste events.
- Een apart scenario voor foutieve brondata, een verlopen identiteit of een geweigerde subscription.
- Meerdere verstoringen, zoals chauffeuruitval of een gesloten losdock, met eigen operationele keuzes.
- Een onderzoeksmodus met gerandomiseerde rondevolgorde en controlegroepen om leereffecten beter te scheiden.
- Fysiek gescheiden organisatiebackends of een expliciete WebRTC-variant, alleen als technisch en didactisch afzonderlijk gewenst.
- Professioneel ingesproken audio en aanvullende talen na gebruikerstests.
- Extra kijklinks voor deelnemers op afstand of een overkoepelend dashboard voor meerdere spelleiders, met eigen rechtenmodel. Het centrale trainingsoverzicht voor de aanwezige zaal behoort al tot de basisgame.
- Export van geanonimiseerde leerresultaten of koppeling aan een leeromgeving.

De basisopdracht eindigt bij de complete, geteste remake zoals hierboven beschreven. Deze ideeën zijn geen automatische vervolgstappen.
