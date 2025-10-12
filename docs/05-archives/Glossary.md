# Glossary
## The Shrey Method Fitness Platform Guide

[← Back to Troubleshooting](Troubleshooting.md) | [Back to Index](Fitness_Platform_Guide_Index.md)

---

This glossary explains technical terms used throughout the guide. If you encounter an unfamiliar term while following the instructions, check here for a simple explanation.

## A

### API (Application Programming Interface)
A set of rules that allows different software applications to communicate with each other. In our project, APIs allow the frontend (what users see) to communicate with the backend (servers and databases).

### AWS (Amazon Web Services)
A cloud computing platform that provides various services like hosting, databases, and authentication. We use AWS to host our fitness platform.

### AWS Amplify
A set of tools and services that helps developers build web and mobile applications on AWS. We use Amplify to simplify the development process.

### Authentication
The process of verifying a user's identity, typically through a username and password. Our platform uses AWS Cognito for authentication.

### Authorization
The process of determining what actions a user is allowed to perform. For example, coaches can access different features than clients.

## B

### Backend
The server-side of an application that handles data processing, business logic, and database operations. Users don't directly interact with the backend.

### Browser Console
A tool built into web browsers that allows developers to see errors, logs, and other information about a webpage. Useful for troubleshooting.

## C

### Calendly
A scheduling tool that allows users to book appointments based on your availability. We use Calendly for scheduling sessions between coaches and clients.

### CLI (Command Line Interface)
A text-based interface used to run programs, manage files, and interact with the computer. We use the AWS Amplify CLI to configure our project.

### Cloud Computing
The delivery of computing services over the internet ("the cloud"), including servers, storage, databases, and more. AWS is a cloud computing provider.

### CORS (Cross-Origin Resource Sharing)
A security feature that restricts web pages from making requests to a different domain than the one that served the original page. Sometimes causes issues in web development.

### CSS (Cascading Style Sheets)
A language used to describe the presentation of a document written in HTML. CSS controls the layout, colors, fonts, and other visual aspects of a webpage.

## D

### Dashboard
A user interface that displays important information and provides access to various features. Our platform has separate dashboards for clients and coaches.

### Database
A structured collection of data that can be accessed, managed, and updated. We use AWS DynamoDB as our database.

### DynamoDB
A fully managed NoSQL database service provided by AWS. It's designed to provide fast and predictable performance with seamless scalability.

## E

### Event Listener
A procedure in JavaScript that waits for an event to occur, such as a button click or form submission, and then executes code in response.

## F

### Frontend
The client-side of an application that users interact with directly. It includes everything the user experiences: text, images, buttons, forms, etc.

### Function
A block of code designed to perform a particular task. Functions are reusable and can be called from different parts of a program.

## G

### GraphQL
A query language for APIs and a runtime for executing those queries with your existing data. We use GraphQL for our API.

## H

### HTML (HyperText Markup Language)
The standard markup language for documents designed to be displayed in a web browser. HTML defines the structure of web content.

### HTTP (HyperText Transfer Protocol)
The foundation of data communication on the World Wide Web. HTTP is the protocol used to transfer data between a web browser and a web server.

## I

### IAM (Identity and Access Management)
An AWS service that helps you control access to AWS resources. IAM allows you to manage users, groups, and permissions.

### IDE (Integrated Development Environment)
A software application that provides comprehensive facilities for software development. We use Visual Studio Code (VS Code) as our IDE.

## J

### JavaScript
A programming language that allows you to implement complex features on web pages. JavaScript is essential for creating interactive web applications.

### JSON (JavaScript Object Notation)
A lightweight data-interchange format that is easy for humans to read and write and easy for machines to parse and generate. Often used for storing and exchanging data.

## L

### Lambda
An AWS service that lets you run code without provisioning or managing servers. We use Lambda for our payment processing function.

### Library
A collection of pre-written code that can be used to simplify tasks. For example, we use the Stripe library for payment processing.

## M

### Middleware
Software that acts as a bridge between an operating system or database and applications. In our project, middleware handles tasks like authentication.

## N

### Node.js
A JavaScript runtime built on Chrome's V8 JavaScript engine. Node.js allows you to run JavaScript on the server side.

### NoSQL
A type of database that doesn't use the traditional table-based relational database structure. DynamoDB is a NoSQL database.

## P

### Payment Gateway
A service that authorizes credit card payments for online businesses. We use Stripe as our payment gateway.

### Permission
An authorization to perform a specific action. In our project, permissions control what users can do based on their role (client or coach).

## R

### REST API
An architectural style for designing networked applications. REST (Representational State Transfer) APIs use HTTP requests to perform CRUD operations.

### Runtime
The environment in which a program executes. For example, Node.js is a JavaScript runtime.

## S

### S3 (Simple Storage Service)
An AWS service that provides object storage through a web service interface. We use S3 to store files like workout PDFs and images.

### Schema
A blueprint that defines the structure of a database. In GraphQL, a schema defines the types of data that can be queried.

### SDK (Software Development Kit)
A collection of software development tools in one installable package. We use the AWS SDK to interact with AWS services.

### Stripe
A payment processing platform that allows businesses to accept payments online. We use Stripe for handling payments in our fitness platform.

## T

### Terminal
A text-based interface used to interact with your computer's operating system. We use the terminal to run commands like `amplify init`.

### Token
A piece of data that represents something else, such as a user's identity or authentication status. JWT (JSON Web Token) is a common type of token.

## U

### UI (User Interface)
The point of interaction between a user and a software application. It includes all the visual elements that users interact with.

### URL (Uniform Resource Locator)
The address of a resource on the internet. For example, `https://example.com` is a URL.

### User Pool
A user directory in Amazon Cognito. A user pool is a container for user accounts and provides features like sign-up, sign-in, and account recovery.

## V

### Variable
A named storage location in a program that contains data which can be modified during program execution.

### VS Code (Visual Studio Code)
A free source-code editor made by Microsoft. We use VS Code as our IDE for writing and editing code.

## W

### Widget
A small application with limited functionality that can be embedded in a website. For example, we embed a Calendly widget for scheduling.

### Webhook
A way for an app to provide other applications with real-time information. A webhook delivers data to other applications as it happens.

## Additional Resources

If you encounter a term that's not in this glossary, here are some resources where you can look it up:

- [MDN Web Docs](https://developer.mozilla.org/en-US/) - Comprehensive documentation for web technologies
- [AWS Documentation](https://docs.aws.amazon.com/) - Official documentation for AWS services
- [W3Schools](https://www.w3schools.com/) - Web development tutorials and references

---

[← Back to Troubleshooting](Troubleshooting.md) | [Back to Index](Fitness_Platform_Guide_Index.md)
