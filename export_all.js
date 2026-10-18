async function exportPolishDataAsZip() {
  const zip = new JSZip();

  // Helper function to convert data (array of objects or raw string) to a CSV string
  function convertToCSV(data) {
    if (!data) return "";
    if (typeof data === "string") return data; // If already a CSV string
    
    // If it's an array of objects
    if (Array.isArray(data) && data.length > 0) {
      const headers = Object.keys(data[0]);
      const rows = data.map(row => 
        headers.map(header => JSON.stringify(row[header] ?? "")).join(",")
      );
      return [headers.join(","), ...rows].join("\n");
    }
    return "";
  }

  // Assuming your app stores these datasets in variables or localStorage:
  // (Replace window.stashData, etc., with your actual data sources/variables)
  const datasets = {
    "stash.csv": convertToCSV(window.stashData || localStorage.getItem('stash')),
    "wishlist.csv": convertToCSV(window.wishlistData || localStorage.getItem('wishlist')),
    "destash.csv": convertToCSV(window.destashData || localStorage.getItem('destash')),
    "archive.csv": convertToCSV(window.archiveData || localStorage.getItem('archive'))
  };

  // Add each file to the ZIP archive
  for (const [filename, csvContent] of Object.entries(datasets)) {
    if (csvContent) {
      zip.file(filename, csvContent);
    }
  }

  try {
    // Generate the ZIP file blob
    const content = await zip.generateAsync({ type: "blob" });
    
    // Create a temporary download link and trigger it
    const url = window.URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nail-polish-backup-" + new Date().toISOString().slice(0, 10) + ".zip";
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    a.remove();
  } catch (error) {
    console.error("Failed to generate zip export:", error);
    alert("Error generating export zip file.");
  }
}