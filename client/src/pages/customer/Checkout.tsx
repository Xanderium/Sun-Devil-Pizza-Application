import React, {useCallback, useEffect, useState} from "react"
import {GlobalState} from "../../common/types";
import {Card} from "react-bootstrap";
import PageWrapper from "../common/PageWrapper";
import {useNavigate} from "react-router";
import FormTextInput from "../../common/components/FormTextInput";
import FormSelectInput from "../../common/components/FormSelectInput";
import { isForInStatement } from "typescript";

type CheckoutProps = {
    state: GlobalState,
    updateGlobalState: (newState: GlobalState) => void
}

function Checkout({ state, updateGlobalState }: CheckoutProps) {
    const navigate = useNavigate();

    const [buttonDisabled, setButtonDisabled] = useState(true);
    const [cart, setCart]: any = useState({
        subtotal: "0.00",
        tax:"0.00",
        total:"0.00",
        items: [
            {
                pizzaType:"",
                toppings:[]
            }
        ]
    });
    const [values, setValues]: any = useState({
        firstName: "",
        lastName: "",
        email: "",
        cardNumber: "",
        expirationMonth: "",
        expirationYear: "",
        cardCVV: "",
        asuID: ""
    });

    const inputs: any = [
        {
            id:"firstName",
            name:"firstName",
            type:"text",
            placeholder:"First Name",
            pattern:"^[A-Za-z]{3,}$",
            required:true,
            errorMessage:"Please provide your first name.",
            label:"First Name",
        },
        {
            id:"lastName",
            name:"lastName",
            type:"text",
            placeholder:"Last Name",
            pattern:"^[A-Za-z]{3,}$",
            required:true,
            errorMessage:"Please provide your last name.",
            label:"Last Name",
        },
        {
            id:"email",
            name:"email",
            type:"text",
            placeholder:"Email Address",
            pattern:"^([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\.([a-zA-Z]{2,5})$",
            required:true,
            errorMessage:"Please provide a valid email address.",
            label:"Email Address"
        },
        {
            id:"cardNumber",
            name:"cardNumber",
            type:"text",
            pattern:"^(?:4[0-9]{12}(?:[0-9]{3})?|(?:5[1-5][0-9]{2}|222[1-9]|22[3-9][0-9]|2[3-6][0-9]{2}|27[01][0-9]|2720)[0-9]{12}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$",
            required:true,
            isCardInput: true,
            errorMessage:"Please provide a valid card number.",
            placeholder:"Card Number",
            label:"Card Number"
        },
        {
            id:"expirationMonth",
            name:"expirationMonth",
            type:"select",
            placeholder:"",
            required:true,
            errorMessage:"Please choose a valid expiration month (1-12)",
            label:"Expiration Month",
            options:["Month", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        },
        {
            id:"expirationYear",
            name:"expirationYear",
            type:"select",
            placeholder:"",
            required:true,
            errorMessage:"Please choose a valid expiration year (22+)",
            label:"Expiration Year",
            options:["Year", 22, 23, 24, 25, 26, 27, 28, 29, 30]
        },
        {
            id:"cardCVV",
            name:"cardCVV",
            type:"text",
            required:true,
            placeholder:"CVV",
            label:"CVV"
        },
        {
            id:"asuID",
            name:"asuID",
            type:"text",
            pattern:"^[0-9]{3,}$",
            required:true,
            placeholder:"ASURITE ID",
            label:"ASURITE ID"
        },
    ];

    const onChange = (event: any) => {
        var target = event.target;
        if(target.id === "cardNumber" && luhnValidate(target.value)) {
            target.setCustomValidity("");
        }
        setValues({
            ...values,
            [event.target.name]: event.target.value
        });
    };

    const luhnValidate = (card: any) => {
        return !/^\d+$/.test(card) || (card.split('').reduce((sum: any, d: any, n: any) => { 
            return sum + parseInt(((n + card.length) %2)? d: [0,2,4,6,8,1,3,5,7,9][d]);
        }, 0)) % 10 == 0;
    };

    const onCheckout = useCallback((event: any) => {
        event.preventDefault();
        var cardInput = event.target.cardNumber;
        var validCard = luhnValidate(cardInput.value);
        if(!validCard) {
            cardInput.setCustomValidity("Please match the requested format.");
            return;
        }
        console.log(validCard);
        fetch("/checkout", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(
                {
                    "firstName":values["firstName"],
                    "lastName":values["lastName"],
                    "email":values["email"],
                    "expirationMonth":values["expirationMonth"],
                    "expirationYear":values["expirationYear"],
                    "cardCVV":values["cardCVV"],
                    "cardNumber":values["cardNumber"],
                    "asuID": values["asuID"]
                }),})
            .then((response) => {
                if(response.status !== 200) {
                    throw new Error("Bad Server Response");
                }
                navigate("/checkout-complete");
            })
            .catch((error) => { console.log(error); });
        return false;
    },[values["firstName"],values["cardNumber"],values["asuID"]]);

    useEffect(() => {
        fetch("/getCart")
        .then(response => {
            if(response.status !== 200) {
                throw new Error("Bad Server Response");
            }
            return response.text();
        })
        .then(result => {
            result = JSON.parse(result);
            setCart(result);
        })
        .catch((error) => { console.log(error) });
    }, []);

    return (
        <PageWrapper state={state} updateGlobalState={updateGlobalState}>
            <Card className="col-8 m-auto">
                <Card.Header>
                    <h1>Welcome to SunDevil Pizza</h1>
                </Card.Header>
                <Card.Body>
                    <div className="container">
                        <h2>Cart</h2>
                        <Card>
                            <Card.Body className="card body">
                                <ul className="list-group list-group-flush p-2">
                                    {cart.items.map((item: any) => {
                                        return <li className="list-group-item">
                                            <h5 className="card-title">{item.type} Pizza</h5>
                                            {item.toppings.length === 0 && <h6 className="card-text">Toppings: {item.toppings.join(", ")}</h6>}
                                            <small>$10.99</small>
                                        </li>
                                    })}
                                </ul>
                                <br/>
                                <div className="container">
                                    <h4>Subtotal: ${cart.subtotal}</h4>
                                    <h4>Tax: ${cart.tax}</h4>
                                    <h4>Total: ${cart.total}</h4>
                                </div>
                            </Card.Body>
                        </Card>
                    </div>
                    <br/>
                    <div className="container">
                        <h2>
                            Checkout
                            <small className="text-muted"> Enter Details</small>
                        </h2>
                        <form action="" onSubmit={onCheckout}>
                            {inputs.map((input: any) => {
                                if(input.type === "text") return <FormTextInput key={input.id} {...input} value={values[input.name]} isCardInput={input.isCardInput} errorMessage={input.errorMessage} onChange={onChange} ></FormTextInput>
                                else return <FormSelectInput key={input.id} {...input} value={values[input.name]} options={input.options.join("&")} errorMessage={input.errorMessage} onChange={onChange}></FormSelectInput>
                            })}
                            <br/>
                            <button className="btn btn-primary" type="submit">Checkout</button>
                        </form>
                    </div>
                </Card.Body>
            </Card>
        </PageWrapper>
    )
}

export default Checkout;
