# Project of Data Visualization (COM-480)

| Student's name | SCIPER |
| -------------- | ------ |
| Najmeddine ABBASSI | 341889 |
| Verter STOILOV | 328691 |
| Malen RAYCHEV | 287015 |

[Milestone 1](#milestone-1) • [Milestone 2](#milestone-2) • [Milestone 3](#milestone-3)

## Milestone 1 (18th March)

### Dataset

We use a combination of publicly available datasets describing the Delhi Metro Rail network:

- **[Delhi Metro Network (Kaggle)](https://www.kaggle.com/datasets/arashnic/metro-network-dynamics?resource=download)** — station names, line assignments, geographic coordinates (latitude/longitude), opening dates, and layout type (elevated/underground/at-grade) for all ~286 operational stations across 10 lines.
- **[Delhi Metro Dataset (Kaggle)](https://www.kaggle.com/datasets/nikhilkumar766/delhi-metro-dataset)** — complementary dataset used for cross-validation and additional station metadata.
- **[Wikipedia — List of Delhi Metro stations](https://en.wikipedia.org/wiki/List_of_Delhi_Metro_stations)** — scraped via a custom script (`wikidata_scraping.ipynb`) to enrich station entries with additional attributes not present in the Kaggle datasets.

**Data quality assessment:** The Kaggle datasets are well-structured and complete, with consistent column naming and no missing coordinates. Minor issues include a small number of inconsistent transliterations of station names, a few stations missing their opening year, and few stations missing that were opened recently. Overall, preprocessing effort is low — the data is clean enough to begin visualization after a join between the datasets.

### Problematic

The main goal of this project is to visualize the New Delhi Metro as an interactive system rather than a static transport map. The idea is to show the geographic footprint of the network and the structure behind it: location of each station, connections between lines, major interchanges, services available at each station, and nearby points of interest. A potential easter egg can be adding a detail like the related work shared down this document, which is the NYC metro station music performers videos.

The general interest of this work is to render the metro network at multiple levels of detail. At the highest level, users see the full network laid out geographically over a city map, color-coded by line. Zooming in reveals individual stations with metadata overlays — construction type, year of opening, interchange status, and nearby landmarks. A timeline mode will let users replay the historical expansion of the network phase by phase, from the first corridor in 2002 to the most recent extensions.


### Exploratory Data Analysis

Full analysis is available in [`data/dataExploration.ipynb`](data/dataExploration.ipynb).

### Related work

- **Official DMRC map** ([dmrc.com](https://www.dmrc.com/)) — a static schematic diagram, not geographically accurate, with no interactivity or historical context.
- **[NYC Subway Artists map](https://felt.com/map/NYC-Subway-Artists-zhurdEV9CRTaMpxFrcxRieA?loc=40.738477,-73.986106,15.77z)** — an interactive map of street performers across NYC subway stations; a strong inspiration for layering cultural/human data on top of a transit network.
- **[Rome Metro vs. actual geography](https://www.reddit.com/r/dataisbeautiful/comments/a2hk6j/rome_metro_vs_actual_geography_oc/#lightbox)** — a visualization comparing the schematic metro map to the real geographic layout of the city; directly motivates our goal of grounding the Delhi Metro in its true geographic context.
- **[NYC Subway Visualization](https://yangdanny97.github.io/nyc-subway-vis/)** — an interactive geographic visualization of the NYC subway network; a direct inspiration for our approach to rendering a metro system with geographic accuracy and interactivity.
- **[Delhi Metro Interactive Legend (ArcGIS)](https://www.arcgis.com/apps/instant/interactivelegend/index.html?appid=97844910afda457a942bb68499932f83)** — an existing interactive map of the Delhi Metro built on ArcGIS; highlights what is already available and what our visualization aims to go beyond.

Our approach is original in combining three elements not found together in existing work: (1) a geographically accurate interactive map layered over the real city street grid, (2) an animated timeline of network growth phase by phase, and (3) a per-station detail panel surfacing construction type, interchange connections, and nearby landmarks.


## Milestone 2 (17th April, 5pm)

**10% of the final grade**


## Milestone 3 (29th May, 5pm)

**80% of the final grade**


## Late policy

- < 24h: 80% of the grade for the milestone
- < 48h: 70% of the grade for the milestone

