import React, { useState, useEffect, useCallback } from "react";
import {useDropzone} from  "react-dropzone";
import axios from "axios";

const QuestionsForm = () => {const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [subtopics, setSubtopics] = useState([]);
  const [refresh, setRefresh] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedChapter, setSelectedChapter] = useState("");
  const [selectedSubtopic, setSelectedSubtopic] = useState("");
  const [newSubjects, setNewSubjects] = useState([]);
  const [newChapters, setNewChapters] = useState([]);
  const [newSubtopics, setNewSubtopics] = useState([]);
  const [inputValues, setInputValues] = useState({
    subject: "",
    chapter: "",
    subtopic: "",
  });
  const [questionType, setQuestionType] = useState("");
  const [question, setQuestion] = useState("");
  const [formData, setFormData] = useState({
    questionText: "",
    questionImage: null,
    options: { A: "", B: "", C: "", D: "" },
    optionImages: { A: null, B: null, C: null, D: null },
    solution: "",
    solutionImage: null,
  });

  const [errors, setErrors] = useState({});
  const [isFormValid, setIsFormValid] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, [refresh]);

  const fetchSubjects = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getsubjects`);

      console.log("API Response:", response.data);

      if (response.data && Array.isArray(response.data.data)) {
        setSubjects(response.data.data);
      } else {
        console.error("Invalid API response format:", response.data);
        setSubjects([]);
      }
    } catch (error) {
      console.error("Error fetching subjects", error);
      setSubjects([]);
    }
  };

  const fetchChapters = async (subject) => {
    if (!subject) return;

    try {
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getchapters?subject=${subject}`);

      console.log("API Response:", response.data);

      if (response.data && Array.isArray(response.data.data)) {
        setChapters(response.data.data);
      } else {
        console.error("Invalid API response format:", response.data);
        setChapters([]);
      }
    } catch (error) {
      console.error("Error fetching chapters", error);
      setChapters([]);
    }
  };

  const fetchSubtopics = async (chapter, subject) => {
    if (!chapter || !subject) {
      console.error("❌ Missing chapter or subject:", { chapter, subject });
      return;
    }

    try {
      const response = await axios.get(`${process.env.REACT_APP_URL}/api/getsubtopics?subject=${subject}&chapter=${chapter}`);
      setSubtopics(response.data.data);
      console.log("✅ Fetched subtopics:", response.data.data);
    } catch (error) {
      console.error("❌ Error fetching subtopics", error);
    }
  };

  const handleAddItem = async (type) => {
    const value = inputValues[type].trim();
    if (!value) return;

    const newItem = { _id: Date.now().toString(), name: value };

    if (type === "subject") {
      try {
        const response = await axios.post(`${process.env.REACT_APP_URL}/api/createsubject`, {
          subjectName: value,
        });
        setSubjects((prev) => [...prev, response.data.data]);
        setRefresh((prev) => !prev);
      } catch (error) {
        console.error("error adding subject", error);
      }
    }
    if (type === "chapter") {
      if (!selectedSubject) {
        console.error("No subject selected for the chapter.");
        return;
      }

      try {
        const response = await axios.post(`${process.env.REACT_APP_URL}/api/createchapter`, {
          chapterName: value,
          subject: selectedSubject.subjectName,
        });

        setChapters((prev) => [...prev, response.data.data]);
        setRefresh((prev) => !prev);
      } catch (error) {
        console.error("Error adding chapter", error);
      }
    }
    if (type === "subtopic") {
      try {
        const response = await axios.post(`${process.env.REACT_APP_URL}/api/createsubtopic`, {
          subtopicName: value,
          subject: selectedSubject.subjectName,
          chapter: selectedChapter.chapterName,
        });
        setSubtopics((prev) => [...prev, response.data.data]);
        setRefresh((prev) => !prev);
      } catch (error) {
        console.error("error adding subject", error);
      }
    }

    setInputValues({ ...inputValues, [type]: "" });
  };

  const handleSelectionChange = async (type, value) => {
    if (type === "subject") {
      const selectedSubj = subjects.find((subj) => subj._id === value);
      setSelectedSubject(selectedSubj || null);

      setSelectedChapter("");
      setSelectedSubtopic("");
      setChapters([]);
      setSubtopics([]);

      if (selectedSubj) await fetchChapters(selectedSubj.subjectName);
    } else if (type === "chapter") {
      setSelectedChapter(value);
      setSelectedSubtopic("");
      setSubtopics([]);
      if (value) await fetchSubtopics(value, selectedSubject.subjectName);
    } else if (type === "subtopic") {
      setSelectedSubtopic(value);
    }
  };

  const handleInputChange = (type, e) => {
    setInputValues({ ...inputValues, [type]: e.target.value });
  };

  const handleFormInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("option")) {
      const key = name.split("_")[1];
      setFormData((prev) => ({
        ...prev,
        options: { ...prev.options, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleOptionChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      options: { ...prev.options, [key]: value },
    }));
  };

  const handleFileUpload = useCallback((file, field) => {
    if (file) {
      setFormData((prev) => ({ ...prev, [field]: file }));
    }
  }, []);

  const {
    getRootProps: getQuestionRootProps,
    getInputProps: getQuestionInputProps,
  } = useDropzone({
    accept: "image/*",
    onDrop: (acceptedFiles) => handleFileUpload(acceptedFiles[0], "questionImage"),
  });

  const {
    getRootProps: getSolutionRootProps,
    getInputProps: getSolutionInputProps,
  } = useDropzone({
    accept: "image/*",
    onDrop: (acceptedFiles) => handleFileUpload(acceptedFiles[0], "solutionImage"),
  });

  const validateForm = () => {
    let newErrors = {};
    if (!selectedSubject) newErrors.subject = "Subject is required";
    if (!selectedChapter) newErrors.chapter = "Chapter is required";
    if (!selectedSubtopic) newErrors.subtopic = "Subtopic is required";
    if (!formData.questionText) newErrors.questionText = "Question is required";
    if (!formData.solution) newErrors.solution = "Solution is required";

    setErrors(newErrors);
    setIsFormValid(Object.keys(newErrors).length === 0);
  };

  useEffect(() => {
    validateForm();
  }, [selectedSubject, selectedChapter, selectedSubtopic, formData, questionType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    const formDataToSend = new FormData();
    formDataToSend.append("subjectId", selectedSubject);
    formDataToSend.append("chapterId", selectedChapter);
    formDataToSend.append("subtopicId", selectedSubtopic);
    formDataToSend.append("questionText", formData.questionText);
    formDataToSend.append("questionType", questionType);
    formDataToSend.append("solution", formData.solution);

    if (formData.questionImage) formDataToSend.append("questionImage", formData.questionImage);
    if (formData.solutionImage) formDataToSend.append("solutionImage", formData.solutionImage);

    Object.entries(formData.options).forEach(([key, value]) => {
      formDataToSend.append(`options[${key}]`, value);
    });

    Object.entries(formData.optionImages).forEach(([key, value]) => {
      if (value) formDataToSend.append(`optionImages[${key}]`, value);
    });

    console.log("📌 Form Data being sent:");
    console.log("Subject ID:", selectedSubject);
    console.log("Chapter ID:", selectedChapter);
    console.log("Subtopic ID:", selectedSubtopic);
    console.log("Question Type:", questionType);
    console.log("Form Data:", formDataToSend);

    try {
      await axios.post(`${process.env.REACT_APP_URL}/api/createquestions`, formDataToSend);
      alert("✅ Question added successfully!");
    } catch (error) {
      console.error("❌ Error submitting question", error);
    }
  };return (
    <form
      onSubmit={handleSubmit}
      className="p-6 border border-gray-300 rounded-lg shadow-lg bg-white max-w-4xl mx-auto"
    >
      {/* Dropdown Selections */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Subject */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Subject</label>

          {/* Text Input */}
          <input
            type="text"
            value={inputValues.subject}
            onChange={(e) => handleInputChange("subject", e)}
            placeholder="Type or select a subject"
            className="mb-2 p-2 border-gray-600 border w-full"
          />

          {/* Always Enabled Dropdown */}
          <select
            value={inputValues.subject} // ✅ Set selected value in the dropdown
            onChange={(e) => {
              const selectedSubject = subjects.find((subj) => subj._id === e.target.value);
              if (selectedSubject) {
                setInputValues({ ...inputValues, subject: selectedSubject.subjectName }); // ✅ Update text input
              }
            }}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-300 mb-2"
          >
            <option value="">Select Subject</option>
            {subjects
              .filter((subj) =>
                subj.subjectName.toLowerCase().includes(inputValues.subject.toLowerCase())
              )
              .map((subj) => (
                <option key={subj._id} value={subj._id}>
                  {subj.subjectName}
                </option>
              ))}
          </select>

          {/* Show Add It! button only if user input doesn't exist in the list */}
          {inputValues.subject &&
            !subjects.some((s) => s.subjectName.toLowerCase() === inputValues.subject.toLowerCase()) && (
              <button
                type="button"
                onClick={() => handleAddItem("subject")}
                className="bg-red-500 text-white p-2 mt-2 rounded-md"
              >
                Don't worry, Add It!
              </button>
            )}
        </div>
        {/* Chapter */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Chapter</label>

          {/* Input Field for Typing Chapter Name */}
          <input
            type="text"
            value={inputValues.chapter}
            onChange={(e) => handleInputChange("chapter", e)}
            placeholder="Type or select a chapter"
            className="mb-2 p-2 border-gray-600 border w-full"
          />

          {/* Dropdown to Select an Existing Chapter */}
          <select
            onChange={(e) => handleSelectionChange("chapter", e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-200 focus:outline-none focus:ring focus:ring-blue-300 mb-2"
          >
            <option value="">Select Chapter</option>
            {chapters
              .filter((chap) => chap.subject === selectedSubject?._id) // Filter chapters for the selected subject
              .concat(newChapters)
              .map((chap) => (
                <option key={chap._id} value={chap._id}>
                  {chap.chapterName} {/* Use `chapterName` instead of `name` */}
                </option>
              ))}
          </select>

          {/* Button to Add a New Chapter if it Doesn't Exist */}
          {inputValues.chapter &&
            !chapters.concat(newChapters).some((c) => c.chapterName === inputValues.chapter) && (
              <button
                type="button"
                onClick={() => handleAddItem("chapter")}
                className="bg-orange-500 text-white p-1 rounded-md mt-2"
              >
                Uh Chill, Add this too!
              </button>
            )}
        </div>
        {/* Subtopic */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Subtopic</label>
          <input
            type="text"
            value={inputValues.subtopic}
            onChange={(e) => handleInputChange("subtopic", e)}
            placeholder="Type or select a chapter"
            className="mb-2 p-2 border-gray-600 border"
          />
          <select
            onChange={(e) => handleSelectionChange("subtopic", e.target.value)}
            className="w-full border border-gray-300 rounded-md p-2 disabled:bg-gray-200 focus:outline-none focus:ring focus:ring-blue-300 mb-2"
          >
            <option value="">Select Subtopic</option>
            {subtopics.concat(newSubtopics).map((sub) => (
              <option key={sub._id} value={sub._id}>
                {sub.name}
              </option>
            ))}
          </select>
          {inputValues.subtopic &&
            !subtopics.concat(newSubtopics).some((c) => c.name === inputValues.subtopic) && (
              <button type="button" onClick={() => handleAddItem("subtopic")} className="bg-yellow-600 text-white p-1">
                Oops, might be last one, Add.
              </button>
            )}
        </div>

        {/* Question Type */}
        <div>
          <label className="block text-gray-700 font-medium mb-1">Question Type</label>
          <select
            onChange={(e) => setQuestionType(e.target.value)}
            value={questionType}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-300"
          >
            <option value="">Select Type</option>
            <option value="MCQ">MCQ</option>
            <option value="Fill in the blanks">Fill in the blanks</option>
          </select>
        </div>
      </div>  
      {/* Question Section */}
      <div className="border border-gray-300 rounded-md p-4 mb-4">
        <label className="block text-gray-700 font-medium mb-2">Question</label>
        <textarea
          name="questionText"
          value={formData.questionText}
          onChange={handleFormInputChange}
          className="w-full border border-gray-600 rounded-md p-2 mb-2 focus:outline-none focus:ring focus:ring-blue-300"
          placeholder="Enter the question..."
        />
        <div className="w-full">
      {/* Drag and Drop Area */}
      <div className="w-full">
          <div
            {...getQuestionRootProps()}
            className="h-24 p-4 border-2 border-dashed border-gray-300 rounded-md text-center cursor-pointer hover:bg-gray-100"
          >
            <input {...getQuestionInputProps()} />
            <p className="text-gray-700">Drag & Drop your Image here.</p>
          </div>

          {/* File Input as Backup */}
          <input
            type="file"
            onChange={(e) => handleFileUpload(e.target.files[0], "questionImage")}
            className="mt-2 block w-full text-sm text-gray-500 file:border file:border-gray-300 file:rounded-md file:py-1 file:px-2 file:bg-gray-100 file:text-gray-700"
          />

          {/* Image Preview */}
          {formData.questionImage && (
            <div className="mt-3">
              <p className="text-sm text-gray-600">Preview:</p>
              <img
                src={URL.createObjectURL(formData.questionImage)}
                alt="Uploaded"
                className="mt-2 w-32 h-32 object-cover rounded-md border"
              />
            </div>
          )}
        </div>
      </div>
  
      {/* Options Section (Only for MCQ) */}
      {questionType === "MCQ" && (
        <div className="border border-gray-600 rounded-md p-4 mb-4">
          <label className="block text-gray-700 font-medium mb-2">Options</label>
          {["A", "B", "C", "D"].map((key) => (
            <div key={key} className="flex items-center gap-4 mb-2">
              <span className="text-gray-600 font-medium w-16">Option {key}</span>
              <input
                type="text"
                placeholder={`Enter Option ${key}`}
                onChange={(e) => handleOptionChange(key, e.target.value)}
                className="flex-1 border border-gray-300 rounded-md p-2 focus:outline-none focus:ring focus:ring-blue-300"
              />
              <input
                type="file"
                onChange={(e) => handleFileUpload(e, `optionImages[${key}]`)}
                className="text-sm text-gray-500 file:border file:border-gray-300 file:rounded-md file:py-1 file:px-2 file:bg-gray-100 file:text-gray-700"
              />
            </div>
          ))}
        </div>
      )}
  
      {/* Solution Section */}
      <div className="border border-gray-300 rounded-md p-4 mb-4">
    <label className="block text-gray-700 font-medium mb-2">Solution</label>
    <textarea
      name="solution"
      value={formData.solution}
      onChange={handleFormInputChange}
      className="w-full border border-gray-600 rounded-md p-2 mb-2 focus:outline-none focus:ring focus:ring-blue-300"
      placeholder="Enter the solution..."
    />
    {/* Drag and Drop Area */}
    <div className="w-full">
          <div
            {...getSolutionRootProps()}
            className="p-4 h-24 border-2 border-dashed border-gray-300 rounded-md text-center cursor-pointer hover:bg-gray-100"
          >
            <input {...getSolutionInputProps()} />
            <p className="text-gray-700">Drag & Drop your Image here.</p>
          </div>

          {/* File Input as Backup */}
          <input
            type="file"
            onChange={(e) => handleFileUpload(e.target.files[0], "solutionImage")}
            className="mt-2 block w-full text-sm text-gray-500 file:border file:border-gray-300 file:rounded-md file:py-1 file:px-2 file:bg-gray-100 file:text-gray-700"
          />

          {/* Image Preview */}
          {formData.solutionImage && (
            <div className="mt-3">
              <p className="text-sm text-gray-600">Preview:</p>
              <img
                src={URL.createObjectURL(formData.solutionImage)}
                alt="Uploaded"
                className="mt-2 w-32 h-32 object-cover rounded-md border"
              />
            </div>
          )}
        </div>
    </div>

  </div>
      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid}
        className={`px-4 py-2 bg-blue-500 text-white rounded ${!isFormValid && "opacity-50 cursor-not-allowed"}`}
      >
        Submit 
      </button>
    </form>
  );
  
};

export default QuestionsForm;
