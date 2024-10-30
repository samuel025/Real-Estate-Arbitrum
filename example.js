"use client"

import React, {useState, useEffect} from "react";
import { ethers } from "ethers";
import {checkIfImage, getTopCreators} from '../utils';

import {useStateContext} from '../context'
export default function Home() {
  const {address, connect, contract, createPropertyFunction, getPropertiesData} = useStateContext();

  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState([]);
  const [form, setForm] = useState({
    propertyTitle: "",
    description: "",
    category: "",
    price: "",
    images: "",
    propertyAddress: "",
  });

  const handleFormFieldChange = (fieldName, e) => {
    setForm({...form, [fieldName]: e.target.value});
  }

  const handleSubmit = async(e) => {
    e.preventDefault();

    checkIfImage(form.images, async(exists) => {
      if (exists) {
        setIsLoading(true);
        await createPropertyFunction({
          ...form,
          price: ethers.utils.parseUnits(form.price, 18),
        });
        setIsLoading(false);
      } else {
        alert("Please provide a valid image url");
        setForm({...form, images: ""});
      }
    })
  }

  const fetchProperty = async () => {
    setIsLoading(true);
    const data = await getPropertiesData();
    setProperties(data);
    setIsLoading(false);
  }





  useEffect(() => {
    if (contract) fetchProperty();
  }, [address, contract]);
  return (
    <div>
      <button onClick={() => connect()}>Connect</button>
      <h1>Create Form</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <input type="text" placeholder="Property Title" onChange={(e) => handleFormFieldChange("propertyTitle", e)} />
        </div>
        <div>
          <input type="text" placeholder="Description" onChange={(e) => handleFormFieldChange("description", e)} />
        </div>
        <div>
          <input type="text" placeholder="Category" onChange={(e) => handleFormFieldChange("category", e)} />
        </div>
        <div>
          <input type="number" placeholder="Price" onChange={(e) => handleFormFieldChange("price", e)} />
        </div>
        <div>
          <input type="url" placeholder="Images" onChange={(e) => handleFormFieldChange("images", e)} />
        </div>
        <div>
          <input type="text" placeholder="Property Address" onChange={(e) => handleFormFieldChange("propertyAddress", e)} />
        </div>
        <button type="submit">submit</button>
      </form>
    </div>
  );
}
