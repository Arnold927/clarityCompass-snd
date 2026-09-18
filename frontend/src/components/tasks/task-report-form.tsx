import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";

export default function TaskReportForm() {
  const { taskId } = useParams();

  const [indicators, setIndicators] = useState([]);
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null);
  const [disaggValues, setDisaggValues] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchIndicatorsForTask = async () => {
    const response = await axios.get(`/tasks/${taskId}/`);
    return response.data.indicators;
  };

  const submitTaskReport = async (payload: any) => {
    const response = await axios.post("/task-reports/", payload);
    return response.data;
  };

  useEffect(() => {
    fetchIndicatorsForTask().then((data) => setIndicators(data));
  }, [taskId]);

  const handleValueChange = (key: string, value: number) => {
    setDisaggValues((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedIndicator) return alert("Please select an indicator");

    const payload = {
      task: Number(taskId),
      indicator: selectedIndicator.id,
      reported_data: disaggValues,
    };

    setLoading(true);

    try {
      await submitTaskReport(payload);
      setSuccess(true);
      setDisaggValues({});
      setSelectedIndicator(null);
    } catch (error) {
      alert("Error submitting report");
    }

    setLoading(false);
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded shadow">
      <h1 className="text-xl font-bold mb-4">Report Indicator Results</h1>

      {/* Indicator dropdown */}
      <label className="font-semibold">Select Indicator</label>
      <select
        className="border p-2 w-full rounded mb-4"
        value={selectedIndicator?.id || ""}
        onChange={(e) => {
          const ind = indicators.find((i: any) => i.id === Number(e.target.value));
          setSelectedIndicator(ind);
          setDisaggValues({});
        }}
      >
        <option value="">-- Choose indicator --</option>
        {indicators.map((indicator: any) => (
          <option key={indicator.id} value={indicator.id}>
            {indicator.name}
          </option>
        ))}
      </select>

      {/* Disaggregation inputs */}
      {selectedIndicator && (
        <>
          <h3 className="font-semibold mb-2">Enter Disaggregated Values</h3>

          {selectedIndicator.disaggregations.map((d: string) => (
            <div key={d} className="mb-2">
              <label>{d}</label>
              <input
                type="number"
                min="0"
                className="border p-2 w-full rounded"
                value={disaggValues[d] || ""}
                onChange={(e) => handleValueChange(d, Number(e.target.value))}
              />
            </div>
          ))}
        </>
      )}

      {/* Button */}
      <button
        onClick={handleSubmit}
        className="bg-blue-600 text-white px-4 py-2 rounded mt-3"
        disabled={loading}
      >
        {loading ? "Saving..." : "Submit Report"}
      </button>

      {success && (
        <p className="text-green-600 font-semibold mt-3">
          Report submitted!
        </p>
      )}
    </div>
  );
}
