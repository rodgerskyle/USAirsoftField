import React, { Component } from 'react';
import { Page, Text, Font, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { withFirebase } from '../Firebase';

class SignedWaiver extends Component {
    constructor(props) {
        super(props);

        this.state = {
          done: false,
        }
    }

    render() {
    
    const { fname, lname, participantImg, address, city, state, zipcode, age, dob, phone, email, pgname, pgImg, pgphone } = this.props;

    // Document Rendering with state objects
    const WaiverRelease = () => (
      <Document>
        <Page style={styles.body}>
          <Text style={styles.title}>
            US Airsoft World, Inc.
          </Text>
          <Text style={styles.header}>
            Recreational Activities Release of Liability, Waiver of Claims, Express Assumption of Risk and Indemnity Agreement – US Airsoft World, Inc.
          </Text>
          <Text style={styles.warning}>
            THIS IS A RELEASE OF LIABILITY, WAIVER OF CLAIMS, ASSUMPTION OF RISK – PLEASE READ BEFORE SIGNING
          </Text>
          <Text style={styles.text}>
            I represent that I am qualified, in good health, and in proper physical condition to participate in these activities. 
            Express Assumption of Risk Associated with Recreation Activities:
          </Text>
          <Text style={styles.text}>
            I do hereby affirm and acknowledge that I have been fully informed and understand the inherent hazards and risks associated with the recreational activity generally described as Airsoft Game Play, 
            including the rental of equipment and transportation associated therewith of which I am about to engage in. In consideration of US Airsoft World, Inc. furnishing services and or equipment to enable 
            me to participate. I do understand the activity involves risks, dangers and the use of equipment that may result in my injury, illness, potential for permanent disability and or death. I understand 
            fully that this activity involves risks, bodily injury, strains, partial and or total paralysis, fractures, eye injuries, blindness, heat stroke, heart attack, disease, death or other ailments that 
            could cause serious disability and or even death, which may be caused by my own actions or inaction, those of others participating in this recreational activity known as Airsoft Game Play, the 
            condition in which the event takes place, and or the negligence of the owners, agents, employees, officers, directors, stockholders of US Airsoft World, Inc.; accidents, breach of contract, 
            force of nature or any other causes, and the negligence of others. I fully accept and assume all such risk and all responsibility for losses, costs, and damages I may incur as a result of my 
            participation in this activity. I hold harmless US Airsoft World Inc. for any such claim, release from any loss, liability, damages, or cost which any may incur as the result of such claim. 
            Release of liability, Waiver of Claims.
          </Text>
          <Text style={styles.text}>
            I HEREBY RELEASE AND HOLD HARMLESS WITH RESPECT TO ANY AND ALL INJURY, DISABILITY, DEATH, OR LOSS OR DAMAGE TO PERSON OR PROPERTY, WHETHER CAUSED BY NEGLIGENCE OR OTHERWISE, 
            THE FOLLOWING NAMED PERSONS OR ENTITIES, HEREIN REFERRED TO AS RELEASES:     US Airsoft World, Inc., officers, employees, agents, stockholders, owners, representatives, and 
            volunteers, from liability and responsibility whatsoever and for any claims or causes of action that I, my estate, heirs, survivors, executors, or assigns may have for personal 
            injury, property damage, or wrongful death arising from the above activities weather caused by active or passive negligence of the release or otherwise. By executing this document, 
            I agree to hold the releases as listed above harmless and identify there in conjunction with any injury, disability, death, or loss or damage to person or property that may occur 
            as a result of engaging in the above activity known as Airsoft Game Play.
          </Text>
          <Text style={styles.text}>
            This release shall be binding to the fullest extent permitted by law. If any provision of this release is found to be unenforceable, the remaining terms and release shall be enforced.
          </Text>
          <Text style={styles.text}>
            I have read this release and waiver of liability, waiver of claims, indemnity agreement and assumption of risk, understand that I have given up substantial rights by signing it and 
            have signed in freely and without any inducement and assurance of any kind and intend it be a complete and unconditional release of all liability to the greatest extent allowed by law. 
            By signing below, I agree to be bound by this agreement:
          </Text>
          <Text style={styles.text}>
            Print Full Name: <Text style={styles.signed}>{fname + " " + lname}</Text><Text style={styles.spacing}>{"________"}</Text>Participant Signature: {participantImg ? 
            <Image style={styles.image} src={participantImg}/> : <Text></Text> }<Text style={styles.spacing}>{"________"}</Text>
            Date: <Text style={styles.signed}>{(new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear())}</Text>
          </Text>
          <Text style={styles.text}>
            Address: <Text style={styles.signed}>{address}</Text><Text style={styles.spacing}>{"________"}</Text>
            City: <Text style={styles.signed}>{city}</Text><Text style={styles.spacing}>{"________"}</Text>
            State: <Text style={styles.signed}>{state + " "}</Text><Text style={styles.spacing}>{"________"}</Text>
            Zip: <Text style={styles.signed}>{zipcode}</Text> 
          </Text>
          <Text style={styles.text}>
            Age: <Text style={styles.signed}>{age}</Text><Text style={styles.spacing}>{"________"}</Text>
            Date of Birth: <Text style={styles.signed}>{dob}</Text><Text style={styles.spacing}>{"________"}</Text>
            Phone Number: <Text style={styles.signed}>{phone + " "}</Text><Text style={styles.spacing}>{"________"}</Text>
            E-Mail: <Text style={styles.signed}>{email}</Text> 
          </Text>
          <Text style={styles.text}>
            PLAYERS AGES 8-17 MUST HAVE PARENT OR GUARDIAN SIGN BELOW AND CONSENT TO THE RELEASE OF LIABILITY, WAIVER OF CLAIM, EXPRESS ASSUMPTION OF RISK AND INDEMNITY AS OUTLINED ABOVE.
          </Text>
          <Text style={styles.text}>
            Print Parent or Guardian Name: <Text style={styles.signed}>{pgname}</Text><Text style={styles.spacing}>{"________"}</Text>
            Signature: {pgImg ? <Image style={styles.image} src={pgImg}/> : <Text></Text> } 
          </Text>
          <Text style={styles.text}>
            Emergency Phone Number: <Text style={styles.text}>{pgphone + " "}</Text><Text style={styles.spacing}>{"________"}</Text>
            Date: <Text style={styles.signed}>{(new Date().getMonth() + 1) + "-" + (new Date().getDate()) + "-" + (new Date().getFullYear())}</Text>
          </Text>
        </Page>
      </Document>
    )

  //   const fontURL = URL.createObjectURL({font})
//    Font.register({family: "calibri", src: {fontURL}})
    Font.register({
      family: 'calibri',
      src: 'https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf'
    });
    

    const styles = StyleSheet.create({
      body: {
        paddingTop: 35,
        paddingBottom: 35,
        paddingHorizontal: 35,
      },
      text: {
        fontSize: 11,
        fontFamily: "calibri",
        marginBottom: 8,
      },
      signed: {
        fontSize: 11,
        fontFamily: "calibri",
        fontWeight: 'bold',
        borderBottomColor: 'black',
        borderBottomStyle: 'solid',
        borderBottomWidth: 1,
      },
      spacing: {
        fontSize: 11,
        fontFamily: "calibri",
        color: 'white',
      },
      title: {
        fontSize: 16,
        fontFamily: 'calibri',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
      },
      header: {
        fontSize: 16,
        fontFamily: 'calibri',
        fontWeight: 'bold',
      },
      warning: {
        fontSize: 11,
        fontFamily: 'calibri',
        fontWeight: 'bold',
        color: 'red',
        textAlign: 'center',
        borderBottomColor: 'red',
        borderBottomStyle: 'solid',
        borderBottomWidth: 1,
        marginHorizontal: 40,
      },
      image: {
          marginVertical: 15,
          marginHorizontal: 15,
          height: 25,
          width: 100,
      }
    })

    // END DOCUMENT ADDITION

        return(
                // <BlobProvider document={<WaiverRelease />}>
                //     {({ blob, url, loading, error }) => {
                //         // Do whatever you need with blob here
                //         if (!loading && !this.state.done) {
                //             this.setStates({done: true})
                //             //this.props.completeWaiver(blob);
                //             //return <div>Waiver created.</div>;
                //             return null;
                //         }
                //         //return <div>Creating Waiver...</div>
                //         return null;
                //     }}
                // </BlobProvider>
                <WaiverRelease />
        )
    }
}

export default withFirebase(SignedWaiver);