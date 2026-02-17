import React, { useState, useEffect, useCallback } from 'react';
import MainHeader from './Components/MainHeader';
import CategoryHeader from './Components/CategoryHeader';
import SearchResultDisplay from './Components/SearchResultDisplay';
import FilterBarSubject from './Components/FilterBarSubject';
import CategoryBanner from './Components/CategoryBanner';
import axios from 'axios';
import './Styles/Page.css';

const Subject = ({ subjectArg }) => {
  const [showComponent, setShowComponent] = useState(false);
  const [cardDisplay, setCardDisplay] = useState("cards-no-filter");
  const [resultsDisplay, setResultsDisplay] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchObjects, setSearchObjects] = useState([]);
  const [searchPhrase, setSearchPhrase] = useState("");
  const [filterObjects, setFilterObjects] = useState([]); 
  const [fabEquipment, setFabEquipment] = useState([]);
  const [filters, setFilters] = useState([]);
  const [noObjects, setNoObjects] = useState(undefined);

  const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const isLoading = noObjects === undefined;

  // Normalizing "Mathematics" to "Math" for API subtrees
  const subjectCapitalized = subjectArg.toLowerCase() === "mathematics" 
    ? "Math" 
    : subjectArg.charAt(0).toUpperCase() + subjectArg.slice(1);

  // HELPER: Format response into card objects
  const formatDataset = (res, doi) => {
    const metadata = res.data.data.latestVersion.metadataBlocks.citation.fields;
    const files = res.data.data.latestVersion.files;
    
    const title = metadata.find(f => f.typeName === "title")?.value || "Untitled";
    const author = metadata.find(f => f.typeName === "author")?.value[0]?.authorName?.value || "Unknown";
    const desc = metadata.find(f => f.typeName === "dsDescription")?.value[0]?.dsDescriptionValue?.value || "";
    
    const imgFile = files.find(f => {
        const name = f.label.toLowerCase();
        return name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg");
    });

    return {
      imgUrl: imgFile ? `https://dataverse.lib.virginia.edu/api/access/datafile/${imgFile.dataFile.id}` : "https://via.placeholder.com/150",
      title,
      author,
      desc,
      doi: doi.replace("doi:10.18130/", "")
    };
  };

  const pullFacets = async () => {
    try {
      // Using relative path for proxy
      const response = await axios.get("/api/search?q=*&show_facets=true&subtree=CADLibrary");
      const facets = response.data.data.facets[0];
      let formattedList = facets.fabEquipment_ss.labels.map(obj => {
        const name = Object.keys(obj)[0];
        return name.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      });
      setFabEquipment([...new Set(formattedList)].filter(item => !item.includes("3d Printer")));
    } catch (err) { console.error("Facet Error:", err); }
  };

  const pullAllCards = useCallback(async () => {
    setNoObjects(undefined);
    try {
      const contents = await axios.get(`/api/dataverses/CADLibrary${subjectCapitalized}/contents`);
      const dois = contents.data.data.map(item => item.identifier);
      
      const requests = dois.map(doi => axios.get(`/api/datasets/:persistentId/?persistentId=doi:10.18130/${doi}`));
      const results = await Promise.all(requests);
      
      const objects = results.map((r, i) => formatDataset(r, dois[i]));
      const sorted = objects.sort((a, b) => a.title.localeCompare(b.title));
      
      setSearchObjects(sorted);
      setFilterObjects(sorted);
      setNoObjects(sorted.length === 0);
    } catch (err) { 
      console.error("Load Error:", err);
      setNoObjects(true);
    }
  }, [subjectCapitalized]);

  const searchByPhrase = async () => {
    if (!searchTerm) return pullAllCards();
    setNoObjects(undefined);
    try {
      const searchRes = await axios.get(`/api/search?type=dataset&per_page=30&subtree=CADLibrary&q=${searchTerm}`);
      const items = searchRes.data.data.items;
      
      const requests = items.map(item => axios.get(`/api/datasets/:persistentId/?persistentId=${item.global_id}`));
      const results = await Promise.all(requests);
      
      const filtered = results
        .filter(r => {
            const fields = r.data.data.latestVersion.metadataBlocks.educationalcad.fields;
            const discipline = fields.find(f => f.typeName === "disciplines")?.value[0]?.discipline?.value;
            return discipline === subjectCapitalized;
        })
        .map(r => formatDataset(r, r.data.data.persistentId));

      setSearchObjects(filtered);
      setNoObjects(filtered.length === 0);
    } catch (err) { console.error("Search Error:", err); setNoObjects(true); }
  };

  useEffect(() => {
    pullFacets();
    pullAllCards();
  }, [pullAllCards]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchPhrase(searchTerm);
    searchByPhrase();
  };

  const handleFilterChange = (filters) => {
    setFilters(filters);
    if(filters.length === 0) return searchByPhrase();
    
    // In-memory filter for speed, since we already have filterObjects
    const filtered = filterObjects.filter(obj => {
        // Logic for filtering by tags (Requires metadata to be stored in filterObjects)
        return true; 
    });
    setSearchObjects(filtered);
  };

  const handleCheckboxChange = () => {
    setShowComponent(!showComponent);
    setCardDisplay(cardDisplay === "cards" ? "cards-no-filter" : "cards");
    setResultsDisplay(resultsDisplay === "" ? "results" : "");
  };

  return (
    <div className="site">
      <MainHeader input={searchTerm} setInput={setSearchTerm} handleSubmit={handleSubmit} subject={subjectCapitalized} showComponent={showComponent} handleCheckboxChange={handleCheckboxChange} showFilter={true} />
      <CategoryHeader />
      <CategoryBanner subject={subjectCapitalized} />
      <div id="page">
        <div className={resultsDisplay}>
          {showComponent && <FilterBarSubject filters={filters} fabEquipment={fabEquipment} grades={grades} onFilterChange={handleFilterChange} />}
          <SearchResultDisplay loading={isLoading} searchObjects={searchObjects} searchPhrase={searchPhrase} cardDisplay={cardDisplay} subject={subjectArg} />
        </div>
      </div>
    </div>
  );
};

export default Subject;