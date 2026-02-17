import React, {useState, useEffect} from "react";
import "../Styles/Object.css";
import { useParams } from "react-router-dom";
import axios from "axios";
import MainHeader from './MainHeader';
import { useNavigate } from 'react-router-dom';
import CategoryHeader from './CategoryHeader';
import parser from 'html-react-parser';
import '../Styles/Page.css';


const Object = () => {
    const { doi } = useParams();

    const [searchTerm, setSearchTerm] = useState("");
    const [searchObjects, setSearchObjects] = useState([]);
    const [subject, setSubject] = useState("Library");

    const navigate = useNavigate();

    const handleSubmit = (event) => {
        event.preventDefault();
        setSearchObjects([]);
        navigate(`/browse`, {state: searchTerm});
    }


    //metadata fields
    const [imgUrl, setImgUrl] = useState("");
    const [title, setTitle] = useState("");
    const [desc, setDesc] = useState("");
    const [introSentence, setIntroSentence] = useState("");
    const [developerName, setDeveloperName] = useState("");
    const [developerLink, setDeveloperLink] = useState("");
    const [instructionalResourcesUrl, setInstructionalResourcesUrl] = useState(""); 
    const [fabricationGuideUrl, setFabricationGuideUrl] = useState(""); 
    const [primaryDiscipline, setPrimaryDiscipline] = useState("");
    const [secondaryDiscipline, setSecondaryDiscipline] = useState("");
    const [gradeLevels, setGradeLevels] = useState("");
    const [forumLink, setForumLink] = useState("https://forum.cadlibrary.org/");
    const [sampleLearningGoals, setSampleLearningGoals] = useState([]);
    const [hasDeveloper, setHasDeveloper] = useState(false);
    const [instructAvail, setInstructAvail] = useState(false);
    const [fabAvail, setFabAvail] = useState(false);
    const [relatedWorkAvail, setRelatedWorkAvail] = useState(false);
    const [relatedWorkAvailURL, setRelatedWorkAvailURL] = useState(false);
    const [relatedWorks, setRelatedWorks] = useState([])
    const [hasSampleLearningGoals, setHasSampleLearningGoals] = useState(false);

    //citation fields
    const [authorsFormmated, setAuthorsFormatted] = useState("");
    const [year, setYear] = useState("");
    const [pubDate, setPubDate] = useState("");

    // FIX: Simplified DOI logic to avoid double-slashing
    let dataverseDoi = doi.substring(0, 2) + "/" + doi.substring(2);
    let publications = [];
    
    useEffect(() => {
        if(doi === "00000C144undefined") {
            setImgUrl("https://encrypted-tbn1.gstatic.com/images?q=tbn:ANd9GcQI543PLIQIc4To-7vEaHXFBFHwChFBBbEOpQCI1saa02QuDiWz");
            setTitle("Horse Evolution");
            setIntroSentence("This dataset of fossil horse teeth published on <a href='https://www.morphosource.org/'> Morphosource </a> has been selected by Florida Museum scientists to help K12 students understand concepts related to horse evolution and climate change. ");
            setDesc("Three lessons have been developed in collaboration with science teachers that can be used with the 3D files provided.");
            setInstructionalResourcesUrl("http://www.paleoteach.org/chewing-on-change-exploring-the-evolution-of-horses-in-response-to-climate-change/");
            setDeveloperName("Center for Precollegiate Education and Training, University of Florida");
            setDeveloperLink("https://www.cpet.ufl.edu/");
            setFabricationGuideUrl("https://www.morphosource.org/projects/00000C144");
            setPrimaryDiscipline("Science -  Biology");
            setGradeLevels("10, 11, 12")
            setForumLink("https://forum.cadlibrary.org/t/horse-evolution/24");
        } else {
            // FIX: Removed trailing slash from endpoint and added params object
            axios.get("/api/datasets/:persistentId", {
                params: {
                    persistentId: "doi:10.18130/" + dataverseDoi
                }
            })
            .then(object => {

                //file metadata
                let imgID = -1
                let files = object.data.data.latestVersion.files
        
                for (let i = 0; i < files.length; i++) {
                    if (files[i].label.toLowerCase().slice(-3) === "png" || files[i].label.toLowerCase().slice(-3) === "jpg" || files[i].label.toLowerCase().slice(-4) === "jpeg"){
                        imgID = files[i].dataFile.id
                    }
                }
        
                // FIX: Using relative path for image access via Proxy
                setImgUrl("/api/access/datafile/" + imgID);

                //change the citation api response to a dictionary
                let citationBlock = object.data.data.latestVersion.metadataBlocks.citation.fields;
                let citationMetadata = {};

                for(let i = 0; i < citationBlock.length; i++){
                    let key = citationBlock[i].typeName;
                    citationMetadata[key] = citationBlock[i].value;
                }

                //change the educational cad api response to a dictionary
                let educationalCADBlock = object.data.data.latestVersion.metadataBlocks.educationalcad.fields;
                let educationCADMetadata = {};
                for(let i = 0; i < educationalCADBlock.length; i++){
                    let key = educationalCADBlock[i].typeName;
                    educationCADMetadata[key] = educationalCADBlock[i].value;
                }
                
                if("notesText" in citationMetadata){
                    let forumLinkMetadata = citationMetadata["notesText"];
                    forumLinkMetadata = forumLinkMetadata.substring(forumLinkMetadata.indexOf("http"))
                    setForumLink(forumLinkMetadata);
                } else if("forumLink" in educationCADMetadata){
                    setForumLink(educationCADMetadata["forumLink"])
                }

                if("publication" in citationMetadata){
                    setRelatedWorkAvail(true);
                    citationMetadata["publication"].forEach(publication => {
                        if("publicationURL" in publication){
                            setRelatedWorkAvailURL(true);
                            if("publicationCitation" in publication){
                                publications = [{title: publication.publicationCitation.value, url: publication.publicationURL.value}, ...publications];
                            } else {
                                publications = [{title: publication.publicationURL.value, url: publication.publicationURL.value}, ...publications];
                            }
                        } else {
                            publications = [{title: publication.publicationCitation.value}, ...publications]
                        }
                        setRelatedWorks(publications);
                    })
                }

                //set the citation metadata fields
                setTitle(citationMetadata["title"]);

                if(citationMetadata["author"].length >= 2){
                    let authorNames = [];
                    for(let i = 0; i < citationMetadata["author"].length; i++){
                        authorNames.push(citationMetadata["author"][i].authorName.value);
                    }

                    for(let i = 0; i < authorNames.length; i++){
                        let currentAuthor = authorNames[i]
                        let authorLastName =  currentAuthor.substring(0, currentAuthor.indexOf(","));
                        let authorFirstInitial = currentAuthor.charAt(authorLastName.length + 2);
                        authorNames[i] = {firstInitial: authorFirstInitial, lastName: authorLastName}
                    }

                    let authorsFormattedString = "";
                    for(let i = 0; i < authorNames.length - 2; i++){
                        authorsFormattedString += (authorNames[i].lastName + ", " + authorNames[i].firstInitial + "., ")
                    }
                    authorsFormattedString += (authorNames[authorNames.length - 2].lastName + ", " + authorNames[authorNames.length - 2].firstInitial + ". & ")
                    authorsFormattedString += (authorNames[authorNames.length - 1].lastName + ", " + authorNames[authorNames.length - 1].firstInitial + ". ")
                    setAuthorsFormatted(authorsFormattedString)
                } else {
                    let author = citationMetadata["author"][0].authorName.value;
                    formatAuthors(author);
                }

                setIntroSentence(citationMetadata["dsDescription"][0].dsDescriptionValue.value);
                if("bigIdea" in educationCADMetadata){
                    setDesc(educationCADMetadata["bigIdea"])
                } else {
                    setDesc(citationMetadata["dsDescription"][1].dsDescriptionValue.value);
                }

                let publicationDate = object.data.data.latestVersion.lastUpdateTime.substring(0,10);
                setYear(publicationDate.substring(0, 4));
                formatPubDate(publicationDate);

                if("externalContrib" in educationCADMetadata){
                    if ("externalAgency" in educationCADMetadata["externalContrib"][0]){
                        setDeveloperName(educationCADMetadata["externalContrib"][0].externalAgency.value);
                    }

                    if ("externalIdValue" in educationCADMetadata["externalContrib"][0]){
                        setDeveloperLink(educationCADMetadata["externalContrib"][0].externalIdValue.value);
                    }
                    setHasDeveloper(true);
                }
        
                setPrimaryDiscipline(educationCADMetadata['disciplines'][0].discipline.value)
                
                let gradeLevels = educationCADMetadata["gradeLevel"];
                let gradeLevelsStr = "";
                let i;
                for(i = 0; i < gradeLevels.length - 1; i++ ){
                    gradeLevelsStr += (gradeLevels[i] + ", ");
                }
                gradeLevelsStr += gradeLevels[gradeLevels.length-1];
                setGradeLevels(gradeLevelsStr);
                
                if("sampleLearningGoals" in educationCADMetadata){
                    setHasSampleLearningGoals(true);
                    setSampleLearningGoals(educationCADMetadata["sampleLearningGoals"]);
                }
               
                let instructionalID = -1
                let fabricationID = -1

                for (let i = 0; i < files.length; i++) {
                    if (files[i].label.toLowerCase().substring(0, 11) === "fabrication"){
                        fabricationID = files[i].dataFile.id
                    }
                    if (files[i].label.toLowerCase().substring(0, 11) === "instruction"){
                        instructionalID = files[i].dataFile.id
                    }
                }

                if(fabricationID != -1){
                    // FIX: Using relative path
                    setFabricationGuideUrl("/api/access/datafile/" + fabricationID);
                    setFabAvail(true);
                }

                if(instructionalID != -1){
                    // FIX: Using relative path
                    setInstructionalResourcesUrl("/api/access/datafile/" + instructionalID);
                    setInstructAvail(true);
                }
                
            })
            .catch((error) => console.log("Error: ", error.stack));
        }
       
    }, [doi, dataverseDoi])

    const formatAuthors = (author) => {
        if(author.includes("&")){
            let authors = [];
            authors = author.split(" & ");
            let authorLastName1 = authors[0].substring(0, authors[0].indexOf(","));
            let authorFirstInitial1 = authors[0].charAt(authorLastName1.length + 2);
            let authorLastName2 = authors[1].substring(0, authors[1].indexOf(","));
            let authorFirstInitial2 = authors[1].charAt(authorLastName2.length + 2);
            setAuthorsFormatted(authorLastName1 + ", " + authorFirstInitial1 + ". & " + authorLastName2 + ", " + authorFirstInitial2 + ".")
        }
        else {
            let authorLastName = author.substring(0, author.indexOf(","));
            let authorFirstInitial = author.charAt(authorLastName.length + 2);
            setAuthorsFormatted(authorLastName + ", " + authorFirstInitial + ".");
        }
    }

    const formatPubDate = (publicationDate) => {
        let date = publicationDate.split("-");
        let year = date[0];
        let month = date[1];
        if(date[1].charAt(0) === "0"){
            month = month[1];
        }
        let months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        month = months[month - 1]
        let day = date[2];
        if(day[0] === "0"){
            day = day[1];
        }
        setPubDate(month + " " + day + ", " + year);

    }

    return (
        <div>
            <body>
                <div class="site">
                <MainHeader input={searchTerm}  setInput={setSearchTerm} handleSubmit={handleSubmit} subject={subject} showFilter={false}></MainHeader>
                    <CategoryHeader subject={primaryDiscipline}></CategoryHeader>
                    <div id="page">
                        <h2>{title}</h2>
                        <br></br>
                        <div id="details">

                            <div class="desktop-object">
                                <img id="img-single" src={imgUrl} alt="Object Thumbnail Not Found" align="left"></img>
                                {parser(`${introSentence}`)}
                                <br></br>
                                <br></br>

                                <h4> Big Idea </h4>
                                {parser(`${desc}`)}
                            </div>

                            <div class="mobile-object">
                                <div class="centered"><img id="img-single" src={imgUrl} alt="Object Thumbnail Not Found" align="center"></img></div>
                                {introSentence}
                            </div>
                            
                            <div id="box">
                                {hasDeveloper && 
                                <div>
                                    <b>Developer</b>
                                <br></br>
                                <p class="detail"><a href={developerLink}
                                    className={
                                        developerLink === "" ? 'inactive-link' : ''
                                    }
                                    target="_blank" id="dev-link">{developerName}</a></p>
                                </div>}
                                
                                <b>Subject</b>
                                <br></br>
                                <p class="detail">{primaryDiscipline}</p>
                              
                                <b>Grade Levels</b>
                                <p class="detail"> {gradeLevels} </p>
                                
                                <b>Download</b>
                                {(instructAvail || fabAvail) ?
                                <ul>
                                    <li>
                                        {instructAvail ? <a href={instructionalResourcesUrl}>Instructional Resources</a> : <p>No instructional resources at this time</p>}
                                    </li>
                                    <li>
                                       {fabAvail ? <a href={fabricationGuideUrl}>Fabrication Guide</a> : <p>No fabrication guide at this time</p>}
                                    </li>
                                </ul> : <p class="detail">No download packages available for this dataset at this time</p>}
                                

                                <a class="detail" href={forumLink}>Discuss</a>
                            </div>

                            <div class="mobile-object">
                                <h4> Big Idea </h4>
                                {desc}
                            </div>

                        </div>
                        
                        <div>
                            <br />
                            {hasSampleLearningGoals && <h4> Sample Learning Goals </h4>}
                            {hasSampleLearningGoals &&
                                <ul>
                                    {sampleLearningGoals.map((goal) => (
                                        <li> {goal} </li>
                                    ))}
                                </ul>
                            }
                                
                            <h4> Citation </h4>
                                <p>{authorsFormmated} ({year}). <em>{title}</em> [Educational Object]. <em>Educational CAD Model Library</em>. Published {pubDate}. NTLS Coalition. doi:10.18130/{dataverseDoi} </p>

                            {relatedWorkAvail && <h4>Related Articles</h4>}
                            {relatedWorkAvailURL && 
                                <ul>
                                {relatedWorks.map((workl) => (
                                    <li><a href={workl.url}>{workl.title}</a> </li>
                                ))}
                                </ul>
                            }
                            {!relatedWorkAvailURL &&
                                <ul>
                                {relatedWorks.map((workl) => (
                                    <li>{workl.title}</li>
                                ))}
                                </ul>
                            }

                        </div>
                    </div>
                </div>
            </body>
        </div>

    )
}

export default Object;