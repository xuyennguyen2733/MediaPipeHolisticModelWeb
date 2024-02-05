import { useQuery, useQueryClient } from "react-query";
import { useState } from "react";

function DummyForm({ array }) {
  const queryClient = useQueryClient();
  const [inputArray, setInputArray] = useState("");
  const [submittedArray, setSubmittedArray] = useState([]);
  const onChange = (e) => {
    setInputArray(e.target.value);
  };
  const onSubmit = (e) => {
    e.preventDefault();
    const form = e.target;
    form.reset();
    const newArray = inputArray
      .split(",")
      .map((item) => parseFloat(item.trim()));
    setSubmittedArray(newArray);
  };

  const sendData = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/dummy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submittedArray),
      });
      if (!response.ok) {
        throw Error("api response not OK");
      } else {
        console.log("successfully posted data");
        queryClient.refetchQueries("dummy");
      }
    } catch (error) {
      console.error("Error posting data:", error);
    }
  };

  return (
    <>
      <form onSubmit={onSubmit}>
        <input
          name="array"
          type="text"
          placeholder="0.0,-1.234,2.0,..."
          onChange={onChange}
        />
        <button type="submit">Submit</button>
      </form>
      <div>
        Submitted array: {submittedArray.map((item) => item + ", ")}
        <button onClick={sendData}>send</button>
      </div>
    </>
  );
}

function DummyPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dummy"],
    queryFn: () =>
      fetch("http://127.0.0.1:8000/dummy").then((response) => {
        if (!response.ok) {
          throw Error("api response not OK");
        }
        return response.json();
      }),
  });

  if (error) {
    return <h1>oh no, something happended :(((</h1>;
  }

  return (
    <>
      <h1>Dummy</h1>
      <DummyForm />
      {isLoading ? "loading..." : <>{data.array.map((el) => el + ", ")}</>}
    </>
  );
}

export default DummyPage;
