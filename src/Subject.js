import React, { useState, useEffect, useCallback } from 'react';
import MainHeader from './Components/MainHeader';
import CategoryHeader from './Components/CategoryHeader';
import SearchResultDisplay from './Components/SearchResultDisplay';
import FilterBarSubject from './Components/FilterBarSubject';
import './Styles/Page.css';
import axios from 'axios';
import CategoryBanner from './Components/CategoryBanner';

const Subject = ({ subjectArg }) => {

  const [showComponent, setShowComponent] = useState(false); 
  const [cardDisplay, setCardDisplay] = useState("cards-no-filter")
  const [resultsDisplay, setResultsDisplay] = useState("")

  const [searchTerm, setSearchTerm] = useState("");
  const [searchObjects, setSearchObjects] = useState([]);
  const [subject, setSubject] = useState(subjectArg);
  const [searchPhrase, setSearchPhrase] = useState("");
  const [filterObjects, setFilterObjects] = useState([]); 
  const [fabEquipment, setFabEquipment] = useState([]);
  const grades = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

  const [filters, setFilters] = useState([]);
  const [noObjects, setNoObjects] = useState();
  const isLoading = noObjects === undefined;

  let subjectCapitalized = subject.charAt(0).toUpperCase() + subject.slice(1);

  useEffect(() => {
    setSearchObjects([]);
    setSearchTerm("");
    pullFacets();
    pullAllCards();
  }, [])

  const handleSubmit = (event) => {
    event.preventDefault();
    setSearchObjects([]);
    setSearchPhrase("");
    searchByPhrase();
  }

  const pullFacets = async() => {
    // Relative path for Proxy/Vercel
    axios.get("/api/search?q=*&show_facets=true&subtree=CADLibrary")
    .then((response) => {
      let facets = response.data.data.facets[0];
      let equipmentList = [];
      let formattedEquipmentList = [];
      
      facets.fabEquipment_ss.labels.forEach(equipment => {
        equipmentList = [Object.keys(equipment)[0], ...equipmentList];
        equipmentList.forEach(item => {
          let words = item.split(" ")
          for (let i = 0; i < words.length; i++) {
            words[i] = words[i][0].toUpperCase() + words[i].substr(1);
          }
          let updatedWord = words.join(" ")
          formattedEquipmentList.push(updatedWord)
        })
      })

      formattedEquipmentList = [...new Set(formattedEquipmentList)]
      for (let i = 0; i < formattedEquipmentList.length; i++) {
        if(formattedEquipmentList[i].includes("3d Printer") || formattedEquipmentList[i].includes("3d Printer Optional")){
          formattedEquipmentList.splice(i, 2)
        }
      }
      setFabEquipment(formattedEquipmentList);
    })
    .catch((error) => console.log("Facet Error: ", error));
  }

  const pullAllCards = async() => {
    if (subjectCapitalized === "Mathematics") {
      subjectCapitalized = "Math";
    }
    setNoObjects(undefined);
    
    // Relative path for contents
    axios.get(`/api/dataverses/CADLibrary${subjectCapitalized}/contents`)
    .then((response) => {
      const dois = response.data.data.map(item => item.identifier);
      let objects = [];

      // Use Promise.all to prevent network race conditions and spam
      const requests = dois.map(doi => 
        axios.get("/api/datasets/:persistentId", {
          params: { persistentId: "doi:10.18130/" + doi }
        })
      );

      Promise.all(requests).then(responses => {
        responses.forEach((object, index) => {
          const data = object.data.data.latestVersion;
          const citation = data.metadataBlocks.citation.fields;
          
          const title = citation.find(f => f.typeName === "title")?.value || "Untitled";
          const author = citation.find(f => f.typeName === "author")?.value[0]?.authorName?.value || "Unknown";
          const desc = citation.find(f => f.typeName === "dsDescription")?.value[0]?.dsDescriptionValue.value || "";

          let imgID = -1;
          const files = data.files;
          for (let i = 0; i < files.length; i++) {
            const label = files[i].label.toLowerCase();
            if (label.endsWith("png") || label.endsWith("jpg") || label.endsWith("jpeg")){
                imgID = files[i].dataFile.id;
                break;
            }
          }

          // Relative path for images
          const imgUrl = "/api/access/datafile/" + imgID;
          objects.push({imgUrl, title, author, desc, doi: dois[index]});
        });

        let sortedObjects = objects.sort((obj1, obj2) => (obj1.title > obj2.title) ? 1 : (obj1.title < obj2.title) ? -1 : 0)
        setSearchObjects(sortedObjects);
        setFilterObjects(sortedObjects);
        setNoObjects(objects.length === 0);
      });
    })
    .catch((error) => console.log("Load Error: ", error))
  }

  const searchByPhrase = async() => {
    if (searchTerm === "") {
      pullAllCards();
      setSearchPhrase(searchTerm);
      return;
    }
    try {
        setNoObjects(undefined);
        // Relative path for search
        axios.get('/api/search', {
          params: {
            type: "dataset",
            per_page: 30,
            subtree: "CADLibrary",
            q: `"${searchTerm}"`
          }
        })
        .then((response) => {
          if (response.data.data.count_in_response === 0) {
              setSearchObjects([]);
              searchByKeyword();
              return;
          }
          
          const items = response.data.data.items;
          const requests = items.map(item => 
            axios.get("/api/datasets/:persistentId", {
              params: { persistentId: item.global_id }
            })
          );

          Promise.all(requests).then(responses => {
            let objects = [];
            responses.forEach((object, index) => {
              const data = object.data.data.latestVersion;
              let educationalCADBlock = data.metadataBlocks.educationalcad.fields;
              let discipline = educationalCADBlock.find(f => f.typeName === "disciplines")?.value[0]?.discipline?.value;

              if(discipline === subjectCapitalized){
                const citation = data.metadataBlocks.citation.fields;
                const title = citation.find(f => f.typeName === "title")?.value || "Untitled";
                const author = citation.find(f => f.typeName === "author")?.value[0]?.authorName?.value || "Unknown";
                const desc = citation.find(f => f.typeName === "dsDescription")?.value[0]?.dsDescriptionValue.value || "";
                
                let imgID = -1;
                const files = data.files;
                for (let i = 0; i < files.length; i++) {
                    const label = files[i].label.toLowerCase();
                    if (label.endsWith("png") || label.endsWith("jpg") || label.endsWith("jpeg")){
                        imgID = files[i].dataFile.id;
                        break;
                    }
                }
                const imgUrl = "/api/access/datafile/" + imgID;
                const doiIdentifier = items[index].global_id.replace("doi:10.18130/", "");

                objects.push({imgUrl, title, author, desc, doi: doiIdentifier});
              }
            });

            let sortedObjects = objects.sort((obj1, obj2) => (obj1.title > obj2.title) ? 1 : (obj1.title < obj2.title) ? -1 : 0)
            setSearchObjects(sortedObjects);
            setFilterObjects(sortedObjects);
            setNoObjects(objects.length === 0);
          });
        })
    } catch(err) {
        console.log("Search Phrase Error", err)
    }
  }

  const searchByKeyword = async() => {
    if (searchTerm === "") {
      pullAllCards();
      setSearchPhrase(searchTerm);
      return;
    }
    try {
        setNoObjects(undefined);
        axios.get('/api/search', {
          params: {
            type: "dataset",
            per_page: 30,
            subtree: "CADLibrary",
            q: searchTerm
          }
        })
        .then((response) => {
          if (response.data.data.count_in_response === 0) {
              setSearchObjects([]);
              setNoObjects(true);
              return;
          }
          setSearchPhrase(searchTerm);
          const items = response.data.data.items;
          const requests = items.map(item => 
            axios.get("/api/datasets/:persistentId", {
              params: { persistentId: item.global_id }
            })
          );

          Promise.all(requests).then(responses => {
            let objects = [];
            responses.forEach((object, index) => {
              const data = object.data.data.latestVersion;
              let educationalCADBlock = data.metadataBlocks.educationalcad.fields;
              let discipline = educationalCADBlock.find(f => f.typeName === "disciplines")?.value[0]?.discipline?.value;

              if(discipline === subjectCapitalized){
                const citation = data.metadataBlocks.citation.fields;
                const title = citation.find(f => f.typeName === "title")?.value || "Untitled";
                const author = citation.find(f => f.typeName === "author")?.value[0]?.authorName?.value || "Unknown";
                const desc = citation.find(f => f.typeName === "dsDescription")?.value[0]?.dsDescriptionValue.value || "";
    
                let imgID = -1;
                const files = data.files;
                for (let i = 0; i < files.length; i++) {
                    const label = files[i].label.toLowerCase();
                    if (label.endsWith("png") || label.endsWith("jpg") || label.endsWith("jpeg")){
                        imgID = files[i].dataFile.id;
                        break;
                    }
                }
                const imgUrl = "/api/access/datafile/" + imgID;
                const doiIdentifier = items[index].global_id.replace("doi:10.18130/", "");
    
                objects.push({imgUrl, title, author, desc, doi: doiIdentifier});
              }
            });
            let sortedObjects = objects.sort((obj1, obj2) => (obj1.title > obj2.title) ? 1 : (obj1.title < obj2.title) ? -1 : 0)
            setSearchObjects(sortedObjects);
            setFilterObjects(sortedObjects);
            setNoObjects(objects.length === 0);
          });
        })
    } catch(err) {
        console.log("Search Keyword Error", err)
    }
  }

  const pullAllCardsByFilter = async(appliedFilters) => {
    setFilters(appliedFilters);
    setNoObjects(undefined);

    let cleanDois = filterObjects.map(obj => {
      return obj.doi.replace("doi:10.18130/", "");
    });

    const requests = cleanDois.map(doi => 
      axios.get("/api/datasets/:persistentId", {
        params: { persistentId: "doi:10.18130/" + doi }
      })
    );

    Promise.all(requests).then(responses => {
      let filteredResults = [];
      let resultsFound = false;

      responses.forEach(object => {
        const data = object.data.data.latestVersion;
        const eduFields = data.metadataBlocks.educationalcad.fields;
        let educationCADMetadata = {};
        eduFields.forEach(f => { educationCADMetadata[f.typeName] = f.value; });

        let filterValueSubject = educationCADMetadata['disciplines']?.[0]?.discipline?.value;
        let filterValuesFabEquipment = educationCADMetadata['fabEquipment'] || [];
        let filterValuesGrades = educationCADMetadata['gradeLevel'] || [];
        
        const filtersSubjectMet = appliedFilters.includes(filterValueSubject) || 
          (!appliedFilters.includes("Science") && !appliedFilters.includes("Technology") && !appliedFilters.includes("Engineering") && !appliedFilters.includes("Mathematics"));

        const isAnyEquipSelected = fabEquipment.some(e => appliedFilters.includes(e));
        const filtersFabEquipMet = !isAnyEquipSelected || filterValuesFabEquipment.some(e => appliedFilters.includes(e));

        const isAnyGradeSelected = grades.some(g => appliedFilters.includes(g));
        const filtersGradeMet = !isAnyGradeSelected || filterValuesGrades.some(g => appliedFilters.includes(g)) || 
          data.metadataBlocks.citation.fields.find(f => f.typeName === "title")?.value === "Measuring Cups";

        if(filtersSubjectMet && filtersFabEquipMet && filtersGradeMet){
          resultsFound = true;
          const citation = data.metadataBlocks.citation.fields;
          const title = citation.find(f => f.typeName === "title")?.value || "Untitled";
          const author = citation.find(f => f.typeName === "author")?.value[0]?.authorName?.value || "Unknown";
          const desc = citation.find(f => f.typeName === "dsDescription")?.value[0]?.dsDescriptionValue.value || "";

          let imgID = -1;
          const files = data.files;
          for (let i = 0; i < files.length; i++) {
              if (files[i].label.toLowerCase().endsWith("png") || files[i].label.toLowerCase().endsWith("jpg") || files[i].label.toLowerCase().endsWith("jpeg")){
                  imgID = files[i].dataFile.id;
                  break;
              }
          }
          const imgUrl = "/api/access/datafile/" + imgID;
          const doi = (object.data.data.persistentId || object.data.data.identifier || "").replace("doi:10.18130/", "");

          filteredResults.push({imgUrl, title, author, desc, doi});
        }
      });

      let sortedObjects = filteredResults.sort((obj1, obj2) => (obj1.title > obj2.title) ? 1 : (obj1.title < obj2.title) ? -1 : 0)
      setSearchObjects(sortedObjects);
      setNoObjects(!resultsFound);
    }).catch(err => {
      console.error("Filter error", err);
      setNoObjects(true);
    });
  }

  const handleFilterChange = (filters) => {
    if(filters.length === 0){
      searchByPhrase();
    }
    else {
      pullAllCardsByFilter(filters);
    }
  }

  const handleCheckboxChange = () => {
    setShowComponent(!showComponent);
    setCardDisplay(prev => prev === "cards" ? "cards-no-filter" : "cards");
    setResultsDisplay(prev => prev === "" ? "results" : "");
  };

  return (
    <div>
      <div className="site">
        <MainHeader input={searchTerm} setInput={setSearchTerm} handleSubmit={handleSubmit} subject={subjectCapitalized} showComponent={showComponent} handleCheckboxChange={handleCheckboxChange} showFilter={true}></MainHeader>
        <CategoryHeader></CategoryHeader>
        <CategoryBanner subject={subjectCapitalized}></CategoryBanner>
        <div id="page">
          <div className={resultsDisplay}>
              {showComponent && <FilterBarSubject filters={filters} fabEquipment={fabEquipment} grades={grades} onFilterChange={(handleFilterChange)}></FilterBarSubject>}
              <SearchResultDisplay loading={isLoading} searchObjects={searchObjects} searchPhrase={searchPhrase} cardDisplay={cardDisplay} subject={subjectArg}></SearchResultDisplay>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subject;