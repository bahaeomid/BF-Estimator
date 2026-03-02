import { useState, useRef } from 'react';
import { Camera, ChevronRight, Check } from 'lucide-react';

interface Entry {
  date: string;
  bodyFat: number;
  weight: number;
  measurements: {
    height: string;
    weight: string;
    neck: string;
    waist: string;
    hips: string;
  };
  photos: {
    front: string | null;
    side: string | null;
    back: string | null;
  };
  profile: {
    sex: string;
    system: string;
  };
}

const BodyFatEstimator = () => {
  const [view, setView] = useState('home');
  const [profile, setProfile] = useState({ sex: 'male', system: 'imperial' });
  const [measurements, setMeasurements] = useState({
    height: '', weight: '', neck: '', waist: '', hips: ''
  });
  const [photos, setPhotos] = useState<{front: string | null, side: string | null, back: string | null}>({ front: null, side: null, back: null });
  const [currentPhotoType, setCurrentPhotoType] = useState<string | null>(null);
  const [result, setResult] = useState<Entry | null>(null);
  const [history, setHistory] = useState<Entry[]>([]);
  const [selectedRange, setSelectedRange] = useState<{range: string, entries: Entry[], avgBF: string} | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<Entry[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const calculateBodyFat = () => {
    const { sex } = profile;
    const { height, weight, neck, waist, hips } = measurements;
    
    if (!height || !weight || !neck || !waist || (sex === 'female' && !hips)) {
      alert('Please fill in all required measurements');
      return;
    }

    let bodyFat;
    try {
      const h = parseFloat(height);
      const w = parseFloat(weight);
      const n = parseFloat(neck);
      const wa = parseFloat(waist);
      
      if (sex === 'male') {
        bodyFat = 495 / (1.0324 - 0.19077 * Math.log10(wa - n) + 0.15456 * Math.log10(h)) - 450;
      } else {
        const hi = parseFloat(hips);
        bodyFat = 495 / (1.29579 - 0.35004 * Math.log10(wa + hi - n) + 0.22100 * Math.log10(h)) - 450;
      }

      const newEntry: Entry = {
        date: new Date().toISOString(),
        bodyFat: Math.round(bodyFat * 10) / 10,
        weight: parseFloat(weight),
        measurements: { ...measurements },
        photos: { ...photos },
        profile: { ...profile }
      };
      
      setResult(newEntry);
      setHistory(prev => [newEntry, ...prev]);
      setView('result');
    } catch (err: any) {
      alert('Error calculating body fat: ' + err.message);
    }
  };

  const getGalleryRanges = () => {
    if (history.length === 0) return [];
    
    const ranges: Record<string, Entry[]> = {};
    history.forEach((entry: Entry) => {
      if (entry.bodyFat && entry.photos) {
        const rangeStart = Math.floor(entry.bodyFat / 2) * 2;
        const rangeKey = `${rangeStart}-${rangeStart + 2}`;
        if (!ranges[rangeKey]) {
          ranges[rangeKey] = [];
        }
        ranges[rangeKey].push(entry);
      }
    });
    
    return Object.entries(ranges)
      .map(([range, entries]: [string, Entry[]]) => ({
        range,
        entries: entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        avgBF: (entries.reduce((sum: number, e: Entry) => sum + e.bodyFat, 0) / entries.length).toFixed(1)
      }))
      .sort((a, b) => parseFloat(a.range) - parseFloat(b.range));
  };

  const toggleCompareSelection = (entry: Entry) => {
    if (compareSelection.find(e => e.date === entry.date)) {
      setCompareSelection(compareSelection.filter(e => e.date !== entry.date));
    } else if (compareSelection.length < 2) {
      setCompareSelection([...compareSelection, entry]);
    }
  };

  const startCamera = async (photoType: string) => {
    setCurrentPhotoType(photoType);
    
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Camera not available. Please use file upload instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 400 }, height: { ideal: 600 } } 
      });
      streamRef.current = stream;
      setView('camera');
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      alert('Camera access denied. Please use file upload instead.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    
    const webpBlob: Blob = await new Promise((resolve) => {
      canvas.toBlob(resolve as any, 'image/webp', 0.6);
    });
    
    const reader = new FileReader();
    reader.onloadend = () => {
      if (currentPhotoType) {
        setPhotos({ ...photos, [currentPhotoType]: reader.result as string });
      }
      stopCamera();
      setView('photos');
    };
    reader.readAsDataURL(webpBlob);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, photoType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = 400;
        const maxHeight = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = height * (maxWidth / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = width * (maxHeight / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, width, height);

        const webpData = canvas.toDataURL('image/webp', 0.6);
        setPhotos(prev => ({ ...prev, [photoType]: webpData }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const exportHistory = () => {
    try {
      const dataStr = JSON.stringify(history, null, 2);
      const sizeMB = (dataStr.length / 1024 / 1024).toFixed(2);
      
      if (dataStr.length > 50000000) { // 50MB limit
        alert(`Data too large (${sizeMB}MB). Try exporting fewer entries.`);
        return;
      }
      
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bodyfat-complete-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Exported ${history.length} entries with photos. File: ${sizeMB}MB`);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    }
  };

  const importHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const combined: Entry[] = [...imported, ...history];
          const uniqueByDate = combined.filter((entry, index, self) =>
            index === self.findIndex(e => e.date === entry.date)
          );
          uniqueByDate.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
          setHistory(uniqueByDate);
          alert(`Successfully imported! Total entries: ${uniqueByDate.length}`);
          setView('home');
        } else {
          alert('Invalid file format');
        }
      } catch (err) {
        alert('Failed to import file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* HOME BUTTON - Shows on all pages except home */}
      {view !== 'home' && view !== 'camera' && (
        <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
          <div className="max-w-md mx-auto px-6 py-3">
            <button 
              onClick={() => {
                setView('home');
                setCompareMode(false);
                setCompareSelection([]);
                setSelectedRange(null);
              }}
              className="text-blue-600 font-medium flex items-center"
            >
              ← Home
            </button>
          </div>
        </div>
      )}

      {/* HOME VIEW */}
      {view === 'home' && (
        <div className="max-w-md mx-auto p-6">
          <h1 className="text-3xl font-bold mb-2 text-center">Body Fat Tracker</h1>
          <p className="text-gray-600 text-center mb-8">Session-based tracking</p>
          
          {history.length > 0 && (
            <>
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 mb-4">
                <div className="text-sm opacity-90">Latest</div>
                <div className="text-4xl font-bold">{history[0].bodyFat}%</div>
                <div className="text-sm opacity-75">{new Date(history[0].date).toLocaleDateString()}</div>
              </div>
              
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ {history.length} unsaved {history.length === 1 ? 'entry' : 'entries'}. Export before closing!
                </p>
              </div>
            </>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setView('profile')}
              className="w-full bg-blue-500 text-white py-4 rounded-lg font-medium"
            >
              New Measurement
            </button>

            {history.length > 0 && (
              <>
                <button
                  onClick={() => setView('history')}
                  className="w-full bg-gray-100 text-gray-700 py-4 rounded-lg font-medium"
                >
                  View All Entries ({history.length})
                </button>
                
                <button
                  onClick={() => setView('gallery')}
                  className="w-full bg-purple-500 text-white py-4 rounded-lg font-medium"
                >
                  📸 Gallery by Body Fat %
                </button>
                
                <button
                  onClick={exportHistory}
                  className="w-full bg-green-500 text-white py-4 rounded-lg font-medium"
                >
                  📥 Export Complete Data
                </button>
              </>
            )}

            <label className="w-full bg-purple-500 text-white py-4 rounded-lg font-medium cursor-pointer flex items-center justify-center">
              <input type="file" accept=".json" onChange={importHistory} className="hidden" />
              📤 Import Data
            </label>
          </div>
        </div>
      )}

      {/* PROFILE SETUP */}
      {view === 'profile' && (
        <div className="max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Profile Setup</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sex</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setProfile({ ...profile, sex: 'male' })}
                  className={`flex-1 py-3 rounded-lg border-2 ${profile.sex === 'male' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                >
                  Male
                </button>
                <button
                  onClick={() => setProfile({ ...profile, sex: 'female' })}
                  className={`flex-1 py-3 rounded-lg border-2 ${profile.sex === 'female' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                >
                  Female
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Measurement System</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setProfile({ ...profile, system: 'imperial' })}
                  className={`flex-1 py-3 rounded-lg border-2 ${profile.system === 'imperial' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                >
                  Imperial
                </button>
                <button
                  onClick={() => setProfile({ ...profile, system: 'metric' })}
                  className={`flex-1 py-3 rounded-lg border-2 ${profile.system === 'metric' ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                >
                  Metric
                </button>
              </div>
            </div>

            <button onClick={() => setView('measure')} className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium">
              Continue
            </button>
            <button onClick={() => setView('home')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium mt-2">
              Back
            </button>
          </div>
        </div>
      )}

      {/* MEASUREMENTS */}
      {view === 'measure' && (
        <div className="max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Measurements</h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h3 className="font-medium mb-2 text-blue-900">Measurement Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Stand naturally, don't suck in</li>
              <li>• Measure over bare skin, not clothing</li>
              <li>• Keep tape level and snug but not tight</li>
              <li>• Measure at same time of day for consistency</li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Height ({profile.system === 'imperial' ? 'in' : 'cm'})</label>
              <input
                type="tel"
                value={measurements.height}
                onChange={(e) => setMeasurements({ ...measurements, height: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="70"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Weight ({profile.system === 'imperial' ? 'lb' : 'kg'})</label>
              <input
                type="tel"
                value={measurements.weight}
                onChange={(e) => setMeasurements({ ...measurements, weight: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="180"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Neck ({profile.system === 'imperial' ? 'in' : 'cm'})
                <span className="text-xs text-gray-500 ml-2">Below Adam's apple</span>
              </label>
              <input
                type="tel"
                value={measurements.neck}
                onChange={(e) => setMeasurements({ ...measurements, neck: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="15"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Waist ({profile.system === 'imperial' ? 'in' : 'cm'})
                <span className="text-xs text-gray-500 ml-2">At navel level</span>
              </label>
              <input
                type="tel"
                value={measurements.waist}
                onChange={(e) => setMeasurements({ ...measurements, waist: e.target.value })}
                className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                placeholder="34"
              />
            </div>

            {profile.sex === 'female' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hips ({profile.system === 'imperial' ? 'in' : 'cm'})
                  <span className="text-xs text-gray-500 ml-2">At widest point</span>
                </label>
                <input
                  type="tel"
                  value={measurements.hips}
                  onChange={(e) => setMeasurements({ ...measurements, hips: e.target.value })}
                  className="w-full p-3 border-2 border-gray-300 rounded-lg text-lg"
                  placeholder="38"
                />
              </div>
            )}
          </div>

          <button onClick={() => setView('photos')} className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium mt-6">
            Continue to Photos
          </button>
          <button onClick={() => setView('profile')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium mt-2">
            Back
          </button>
        </div>
      )}

      {/* PHOTOS */}
      {view === 'photos' && (
        <div className="max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Take Photos</h2>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <h3 className="font-medium mb-2 text-blue-900">Photo Guidelines</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Good, consistent lighting (same spot each time)</li>
              <li>• Stand naturally with arms at sides</li>
              <li>• Wear fitted clothing or shirtless/sports bra</li>
              <li>• Same distance from camera each time</li>
              <li>• Neutral expression, relaxed posture</li>
            </ul>
          </div>

          <div className="space-y-4">
            {['front', 'side', 'back'].map(type => (
              <div key={type}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium capitalize">{type} View</span>
                  {photos[type] && <Check className="w-5 h-5 text-green-600" />}
                </div>
                
                <div className="flex gap-2">
                  <label className="flex-1 p-4 bg-blue-500 text-white rounded-lg cursor-pointer flex items-center justify-center">
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handleFileUpload(e, type)} className="hidden" />
                    <Camera className="w-5 h-5 mr-2" />
                    Take Photo
                  </label>

                  <label className="flex-1 p-4 bg-gray-600 text-white rounded-lg cursor-pointer flex items-center justify-center">
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, type)} className="hidden" />
                    📁 Upload
                  </label>
                </div>

                {photos[type] && (
                  <div className="mt-2">
                    <img src={photos[type]} alt={type} className="w-full h-48 object-cover rounded-lg border-2 border-green-500" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 p-3 bg-gray-100 rounded text-center">
            Photos: {Object.keys(photos).filter(k => photos[k]).length} / 3
          </div>

          <button
            onClick={calculateBodyFat}
            disabled={!photos.front || !photos.side || !photos.back}
            className={`w-full py-3 rounded-lg font-medium mt-4 ${
              photos.front && photos.side && photos.back
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            Calculate Body Fat %
          </button>
          
          <button onClick={() => setView('measure')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium mt-2">
            Back
          </button>
        </div>
      )}

      {/* CAMERA */}
      {view === 'camera' && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="relative flex-1">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
          
          <div className="p-6 bg-black">
            <div className="text-white text-center mb-4 capitalize">{currentPhotoType} View</div>
            <div className="flex gap-3">
              <button onClick={() => { stopCamera(); setView('photos'); }} className="flex-1 bg-gray-700 text-white py-4 rounded-lg">
                Cancel
              </button>
              <button onClick={capturePhoto} className="flex-1 bg-blue-500 text-white py-4 rounded-lg flex items-center justify-center">
                <Camera className="w-5 h-5 mr-2" />
                Capture
              </button>
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {/* RESULT */}
      {view === 'result' && result && (
        <div className="max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Results</h2>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-8 mb-6 text-center">
            <div className="text-6xl font-bold mb-2">{result.bodyFat}%</div>
            <div className="text-xl opacity-90">Body Fat Percentage</div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6">
            {['front', 'side', 'back'].map(type => (
              <div key={type}>
                <img src={result.photos[type]} alt={type} className="w-full h-40 object-cover rounded-lg" />
                <p className="text-xs text-center mt-1 capitalize text-gray-600">{type}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <button onClick={() => setView('history')} className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium">
              View History ({history.length})
            </button>
            <button
              onClick={() => {
                setView('home');
                setPhotos({ front: null, side: null, back: null });
                setMeasurements({ height: '', weight: '', neck: '', waist: '', hips: '' });
                setResult(null);
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium"
            >
              Done
            </button>
            {history.length > 0 && (
              <button onClick={exportHistory} className="w-full bg-green-500 text-white py-3 rounded-lg font-medium mt-4">
                📥 Export Complete Data
              </button>
            )}
          </div>
        </div>
      )}

      {/* HISTORY */}
      {view === 'history' && (
        <div className="max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">All Entries</h2>

          {history.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No history yet</p>
            </div>
          ) : (
            <>
              {!compareMode ? (
                <>
                  <div className="space-y-4 mb-6">
                    {history.map((entry, idx) => (
                      <div key={idx} className="bg-white border-2 border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-3xl font-bold text-blue-600">{entry.bodyFat}%</div>
                            <div className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</div>
                          </div>
                          <div className="text-right text-sm text-gray-600">
                            <div>{entry.weight} {entry.profile?.system === 'imperial' ? 'lb' : 'kg'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Waist: {entry.measurements.waist}, Neck: {entry.measurements.neck}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {history.length >= 2 && (
                      <button 
                        onClick={() => setCompareMode(true)}
                        className="w-full bg-purple-500 text-white py-3 rounded-lg font-medium"
                      >
                        Compare 2 Entries
                      </button>
                    )}
                    <button onClick={exportHistory} className="w-full bg-green-500 text-white py-3 rounded-lg font-medium">
                      📥 Export Complete Data ({history.length})
                    </button>
                    <button onClick={() => setView('home')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium">
                      Back
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Select 2 entries to compare ({compareSelection.length}/2 selected)
                    </p>
                  </div>

                  <div className="space-y-3 mb-6">
                    {history.map((entry, idx) => {
                      const isSelected = compareSelection.find(e => e.date === entry.date);
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleCompareSelection(entry)}
                          className={`w-full text-left p-4 rounded-lg border-2 ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <div className="flex justify-between">
                            <div>
                              <div className="text-2xl font-bold text-blue-600">{entry.bodyFat}%</div>
                              <div className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</div>
                            </div>
                            {isSelected && <Check className="w-6 h-6 text-blue-600" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => setView('compare')}
                      disabled={compareSelection.length !== 2}
                      className={`w-full py-3 rounded-lg font-medium ${
                        compareSelection.length === 2
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-300 text-gray-500'
                      }`}
                    >
                      View Comparison
                    </button>
                    <button
                      onClick={() => {
                        setCompareMode(false);
                        setCompareSelection([]);
                      }}
                      className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* GALLERY VIEW */}
      {view === 'gallery' && (
        <div className="max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Gallery by Body Fat %</h2>

          {selectedRange ? (
            <div>
              <button 
                onClick={() => setSelectedRange(null)}
                className="mb-4 text-blue-600 flex items-center"
              >
                ← Back to ranges
              </button>
              
              <h3 className="text-xl font-bold mb-4">{selectedRange.range}% Range</h3>
              
              <div className="space-y-4">
                {selectedRange.entries.map((entry, idx) => (
                  <div key={idx} className="bg-white border-2 border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between mb-3">
                      <div className="text-2xl font-bold text-blue-600">{entry.bodyFat}%</div>
                      <div className="text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {['front', 'side', 'back'].map(type => (
                        entry.photos[type] && (
                          <div key={type}>
                            <img src={entry.photos[type]} alt={type} className="w-full h-32 object-cover rounded" />
                            <div className="text-xs text-center text-gray-500 capitalize mt-1">{type}</div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-sm text-blue-800">
                  Your personal body fat reference guide. Tap a range to see all photos from that BF%.
                </p>
              </div>

              {getGalleryRanges().length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No entries with photos yet</p>
                  <p className="text-sm mt-2">Take measurements to build your gallery</p>
                  <div className="mt-4 p-3 bg-yellow-50 rounded text-xs text-left">
                    <div className="font-bold mb-2">Debug Info:</div>
                    <div>Total history entries: {history.length}</div>
                    <div>Entries with bodyFat: {history.filter(e => e.bodyFat).length}</div>
                    <div>Entries with photos object: {history.filter(e => e.photos).length}</div>
                    <div>Entries with front photo: {history.filter(e => e.photos?.front).length}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {getGalleryRanges().map((rangeData, idx) => {
                    const latestEntry = rangeData.entries[0];
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedRange(rangeData)}
                        className="w-full bg-white border-2 border-gray-200 rounded-lg p-4 text-left hover:border-blue-500"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="text-2xl font-bold text-blue-600">{rangeData.range}%</div>
                            <div className="text-xs text-gray-500">{rangeData.entries.length} {rangeData.entries.length === 1 ? 'entry' : 'entries'}</div>
                          </div>
                          
                          {latestEntry.photos.front && (
                            <img 
                              src={latestEntry.photos.front} 
                              alt="preview" 
                              className="w-16 h-20 object-cover rounded"
                            />
                          )}
                          
                          <div className="flex-1">
                            <div className="text-sm text-gray-600">Avg: {rangeData.avgBF}%</div>
                            <div className="text-xs text-gray-500">Latest: {new Date(latestEntry.date).toLocaleDateString()}</div>
                          </div>
                          
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <button onClick={() => setView('home')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium mt-6">
                Back to Home
              </button>
            </>
          )}
        </div>
      )}

      {/* COMPARE VIEW */}
      {view === 'compare' && compareSelection.length === 2 && (
        <div className="max-w-md mx-auto p-6">
          <h2 className="text-2xl font-bold mb-6">Comparison</h2>

          {(() => {
            const sorted = [...compareSelection].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const older = sorted[0];
            const newer = sorted[1];
            const bfDiff = newer.bodyFat - older.bodyFat;
            const weightDiff = newer.weight - older.weight;
            const waistDiff = parseFloat(newer.measurements.waist) - parseFloat(older.measurements.waist);

            return (
              <>
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-2xl p-6 mb-6">
                  <div className="text-center">
                    <div className="text-sm opacity-90 mb-2">Progress</div>
                    <div className="text-4xl font-bold mb-1">
                      {bfDiff > 0 ? '+' : ''}{bfDiff.toFixed(1)}%
                    </div>
                    <div className="text-sm opacity-75">Body Fat Change</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <div className="opacity-75">Weight</div>
                      <div className="font-medium">{weightDiff > 0 ? '+' : ''}{weightDiff.toFixed(1)} {newer.profile?.system === 'imperial' ? 'lb' : 'kg'}</div>
                    </div>
                    <div>
                      <div className="opacity-75">Waist</div>
                      <div className="font-medium">{waistDiff > 0 ? '+' : ''}{waistDiff.toFixed(1)} {newer.profile?.system === 'imperial' ? 'in' : 'cm'}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[older, newer].map((entry, idx) => (
                    <div key={idx} className="bg-white border-2 border-gray-200 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">{idx === 0 ? 'Before' : 'After'}</div>
                      <div className="text-2xl font-bold text-blue-600 mb-1">{entry.bodyFat}%</div>
                      <div className="text-xs text-gray-500 mb-3">{new Date(entry.date).toLocaleDateString()}</div>
                      {entry.photos && (
                        <div className="space-y-2">
                          {['front', 'side', 'back'].map(type => (
                            entry.photos[type] && (
                              <div key={type}>
                                <img src={entry.photos[type]} alt={type} className="w-full h-32 object-cover rounded" />
                                <div className="text-xs text-center text-gray-500 capitalize mt-1">{type}</div>
                              </div>
                            )
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setView('history');
                    setCompareMode(false);
                    setCompareSelection([]);
                  }}
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium"
                >
                  Back to History
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default BodyFatEstimator;