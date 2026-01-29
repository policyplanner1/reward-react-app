import { useEffect, useState } from "react";
import { api } from "../../../../api/api";
import { FiPlus, FiTrash2 } from "react-icons/fi";

interface Props {
  attributeId: number;
}

export default function AttributeValueManager({ attributeId }: Props) {
  const [values, setValues] = useState<string[]>([""]);

  const fetchValues = async () => {
    const res = await api.get(
      `/manager/category-attribute-values/${attributeId}`
    );

    const fetched = res.data.data.map((v: any) => v.value);

    setValues(fetched.length ? fetched : [""]);
  };

  useEffect(() => {
    fetchValues();
  }, [attributeId]);

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="font-semibold mb-3">Manage Options</h3>

      {values.map((val, index) => (
        <div key={index} className="flex gap-2 mb-2">
          <input
            value={val}
            onChange={(e) => {
              const copy = [...values];
              copy[index] = e.target.value;
              setValues(copy);
            }}
            className="flex-1 px-3 py-2 border rounded"
            placeholder="Enter option..."
          />

          <button
            onClick={() => {
              const copy = values.filter((_, i) => i !== index);
              setValues(copy.length ? copy : [""]);
            }}
            className="text-red-500"
          >
            <FiTrash2 />
          </button>
        </div>
      ))}

      <button
        onClick={() => setValues([...values, ""])}
        className="flex items-center gap-2 mt-3 text-[#852BAF]"
      >
        <FiPlus /> Add More
      </button>

      <button
        onClick={async () => {
          const cleaned = values.map((v) => v.trim()).filter(Boolean);

          await api.post(`/manager/category-attribute-values`, {
            attribute_id: attributeId,
            values: cleaned,
          });

          alert("Saved!");
        }}
        className="mt-4 w-full bg-[#852BAF] text-white py-2 rounded"
      >
        Save Options
      </button>
    </div>
  );
}
